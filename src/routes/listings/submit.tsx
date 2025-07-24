import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { listingOperations } from '~/lib/data';
import { validateListingInput, transformListingInput } from '~/utils/listing';
import { useFileUpload } from '~/hooks/useFileUpload';
import { HoneypotFields, useHoneypotFields } from '~/components/HoneypotFields';
import { detectSpam, listingSubmissionRateLimit } from '~/utils/spam-detection';
import { triggerContentModeration, checkRateLimit } from '~/lib/server-functions';
import type { CreateListingInput, PricingRange, HoursOfOperation } from '~/types';

export const Route = createFileRoute('/listings/submit')({
  component: SubmitListingPage,
});

interface FormStep {
  id: number;
  title: string;
  description: string;
}

const FORM_STEPS: FormStep[] = [
  { id: 1, title: 'Basic Information', description: 'Tell us about your business' },
  { id: 2, title: 'Location & Contact', description: 'Where can customers find you?' },
  { id: 3, title: 'Images & Media', description: 'Show off your business' },
  { id: 4, title: 'Details & Categories', description: 'Help customers discover you' },
  { id: 5, title: 'Review & Submit', description: 'Double-check everything looks good' },
];

const DEFAULT_HOURS: HoursOfOperation = {
  monday: { open: '09:00', close: '17:00', closed: false },
  tuesday: { open: '09:00', close: '17:00', closed: false },
  wednesday: { open: '09:00', close: '17:00', closed: false },
  thursday: { open: '09:00', close: '17:00', closed: false },
  friday: { open: '09:00', close: '17:00', closed: false },
  saturday: { open: '10:00', close: '16:00', closed: false },
  sunday: { open: '', close: '', closed: true },
};

function SubmitListingPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [submissionStartTime] = useState(Date.now());
  const { honeypotValues, updateHoneypotField, getHoneypotData, hasHoneypotViolation } = useHoneypotFields();
  const [formData, setFormData] = useState<CreateListingInput>({
    name: '',
    description: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    latitude: 0,
    longitude: 0,
    phone: '',
    email: '',
    website: '',
    facebook: '',
    twitter: '',
    instagram: '',
    linkedin: '',
    images: [],
    hoursOfOperation: DEFAULT_HOURS,
    pricingRange: undefined,
    categories: [],
    tags: [],
    features: [],
    amenities: [],
  });

  const [errors, setErrors] = useState<string[]>([]);
  const { uploadFile, isUploading, uploadError } = useFileUpload();

  const createListingMutation = useMutation({
    mutationFn: async (input: CreateListingInput & { _moderationData?: any }) => {
      // First create the listing
      const listing = await listingOperations.create(input);
      
      // Then trigger content moderation
      if (listing?.id) {
        const moderationResult = await triggerContentModeration({
          contentType: 'LISTING',
          contentId: listing.id,
          content: {
            text: `${input.name} ${input.description}`,
            images: input.images || [],
          },
          submissionData: input._moderationData,
          submitterId: undefined, // Anonymous submission
        });
        
        console.log('Content moderation result:', moderationResult);
      }
      
      return listing;
    },
    onSuccess: (data) => {
      alert('Listing submitted successfully! It will be reviewed before publication.');
      navigate({ to: '/listings' });
    },
    onError: (error) => {
      console.error('Error creating listing:', error);
      alert('Error submitting listing. Please try again.');
    },
  });

  const handleInputChange = useCallback((field: keyof CreateListingInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  }, [errors.length]);

  const handleImageUpload = useCallback(async (files: FileList) => {
    const uploadPromises = Array.from(files).map(file => 
      uploadFile(file, 'listings')
    );
    
    try {
      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter(url => url !== null) as string[];
      
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...validUrls]
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Error uploading images. Please try again.');
    }
  }, [uploadFile]);

  const removeImage = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || []
    }));
  }, []);

  const validateCurrentStep = (): boolean => {
    const stepErrors: string[] = [];
    
    switch (currentStep) {
      case 1:
        if (!formData.name?.trim()) stepErrors.push('Business name is required');
        if (!formData.description?.trim()) stepErrors.push('Description is required');
        break;
      case 2:
        if (!formData.street?.trim()) stepErrors.push('Street address is required');
        if (!formData.city?.trim()) stepErrors.push('City is required');
        if (!formData.state?.trim()) stepErrors.push('State is required');
        if (!formData.zipCode?.trim()) stepErrors.push('ZIP code is required');
        break;
      case 4:
        if (!formData.categories || formData.categories.length === 0) {
          stepErrors.push('At least one category is required');
        }
        break;
    }
    
    setErrors(stepErrors);
    return stepErrors.length === 0;
  };

  const nextStep = () => {
    if (validateCurrentStep() && currentStep < FORM_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors([]);
    }
  };

  const handleSubmit = async () => {
    // Final validation
    const validationErrors = validateListingInput(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Spam detection
    const submissionTime = Date.now() - submissionStartTime;
    const userAgent = navigator.userAgent;
    const clientIP = ''; // Would be populated by server-side logic
    
    // Check server-side rate limiting
    try {
      const rateLimitResult = await checkRateLimit({
        identifier: formData.email || clientIP || userAgent,
        action: 'listing_submission',
      });
      
      if (!rateLimitResult.allowed) {
        setErrors(['You have submitted too many listings recently. Please try again later.']);
        return;
      }
    } catch (error) {
      console.warn('Rate limit check failed:', error);
      // Continue with submission but log the issue
    }

    // Perform client-side spam detection
    const spamResult = detectSpam({
      text: `${formData.name} ${formData.description}`,
      email: formData.email,
      phone: formData.phone,
      website: formData.website,
      honeypotFields: getHoneypotData(),
      submissionTime,
      userAgent,
      ip: clientIP,
    });

    // Check for honeypot violations
    if (hasHoneypotViolation()) {
      console.warn('Honeypot violation detected');
      // Silently reject - don't show error to potential bot
      return;
    }

    // If high spam score, reject submission immediately
    if (spamResult.isSpam && spamResult.score > 0.8) {
      setErrors(['Your submission appears to be spam. Please review your content and try again.']);
      return;
    }

    // Use geocoding service or default coordinates
    const submissionData = transformListingInput({
      ...formData,
      latitude: formData.latitude || 40.7128, // Default to NYC coordinates
      longitude: formData.longitude || -74.0060,
    });

    // Add moderation metadata
    const submissionWithMeta = {
      ...submissionData,
      _moderationData: {
        text: `${formData.name} ${formData.description}`,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        honeypotFields: getHoneypotData(),
        submissionTime,
        userAgent,
        ip: clientIP,
        spamScore: spamResult.score,
        spamIndicators: spamResult.indicators,
        honeypotTriggered: hasHoneypotViolation(),
      }
    };

    createListingMutation.mutate(submissionWithMeta);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInformationStep 
            formData={formData} 
            onChange={handleInputChange}
            honeypotValues={honeypotValues}
            updateHoneypotField={updateHoneypotField}
          />
        );
      case 2:
        return <LocationContactStep formData={formData} onChange={handleInputChange} />;
      case 3:
        return (
          <ImagesMediaStep 
            formData={formData} 
            onChange={handleInputChange}
            onImageUpload={handleImageUpload}
            onRemoveImage={removeImage}
            isUploading={isUploading}
            uploadError={uploadError}
          />
        );
      case 4:
        return <DetailsCategoriesStep formData={formData} onChange={handleInputChange} />;
      case 5:
        return <ReviewSubmitStep formData={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {FORM_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'border-gray-300 text-gray-500'
                }`}>
                  {currentStep > step.id ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                {index < FORM_STEPS.length - 1 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {FORM_STEPS[currentStep - 1].title}
            </h1>
            <p className="text-gray-600 mt-1">
              {FORM_STEPS[currentStep - 1].description}
            </p>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <h3 className="text-red-800 font-medium mb-2">Please fix the following errors:</h3>
              <ul className="text-red-700 text-sm space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {currentStep < FORM_STEPS.length ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={createListingMutation.isPending}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createListingMutation.isPending ? 'Submitting...' : 'Submit Listing'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step Components
interface StepProps {
  formData: CreateListingInput;
  onChange: (field: keyof CreateListingInput, value: any) => void;
}

function BasicInformationStep({ 
  formData, 
  onChange, 
  honeypotValues, 
  updateHoneypotField 
}: StepProps & { 
  honeypotValues: Record<string, string>; 
  updateHoneypotField: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Honeypot fields - hidden from users */}
      <HoneypotFields values={honeypotValues} onChange={updateHoneypotField} />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onChange('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your business name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Description *
        </label>
        <textarea
          rows={4}
          value={formData.description}
          onChange={(e) => onChange('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe your business, services, and what makes you unique..."
        />
        <p className="text-sm text-gray-500 mt-1">
          A detailed description helps customers understand what you offer.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pricing Range
        </label>
        <select
          value={formData.pricingRange || ''}
          onChange={(e) => onChange('pricingRange', e.target.value as PricingRange)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select pricing range</option>
          <option value="BUDGET">Budget ($)</option>
          <option value="MODERATE">Moderate ($$)</option>
          <option value="EXPENSIVE">Expensive ($$$)</option>
          <option value="LUXURY">Luxury ($$$$)</option>
        </select>
      </div>
    </div>
  );
}

function LocationContactStep({ formData, onChange }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Street Address *
          </label>
          <input
            type="text"
            value={formData.street}
            onChange={(e) => onChange('street', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="123 Main Street"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => onChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="City"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State *
            </label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => onChange('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="State"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ZIP Code *
            </label>
            <input
              type="text"
              value={formData.zipCode}
              onChange={(e) => onChange('zipCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="12345"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country *
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => onChange('country', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="USA"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => onChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="contact@business.com"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website
          </label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => onChange('website', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://www.yourbusiness.com"
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Social Media (Optional)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Facebook
            </label>
            <input
              type="url"
              value={formData.facebook}
              onChange={(e) => onChange('facebook', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://facebook.com/yourbusiness"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instagram
            </label>
            <input
              type="url"
              value={formData.instagram}
              onChange={(e) => onChange('instagram', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://instagram.com/yourbusiness"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Twitter
            </label>
            <input
              type="url"
              value={formData.twitter}
              onChange={(e) => onChange('twitter', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://twitter.com/yourbusiness"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LinkedIn
            </label>
            <input
              type="url"
              value={formData.linkedin}
              onChange={(e) => onChange('linkedin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://linkedin.com/company/yourbusiness"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ImagesMediaStepProps extends StepProps {
  onImageUpload: (files: FileList) => void;
  onRemoveImage: (index: number) => void;
  isUploading: boolean;
  uploadError: string | null;
}

function ImagesMediaStep({ 
  formData, 
  onChange, 
  onImageUpload, 
  onRemoveImage, 
  isUploading, 
  uploadError 
}: ImagesMediaStepProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageUpload(e.target.files);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Images
        </label>
        <p className="text-sm text-gray-500 mb-4">
          Upload high-quality images of your business. The first image will be used as the main photo.
        </p>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="image-upload"
            disabled={isUploading}
          />
          <label
            htmlFor="image-upload"
            className={`cursor-pointer ${isUploading ? 'opacity-50' : ''}`}
          >
            <div className="space-y-2">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="text-sm text-gray-600">
                <span className="font-medium text-blue-600 hover:text-blue-500">
                  Click to upload images
                </span>
                {' '}or drag and drop
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
            </div>
          </label>
        </div>

        {isUploading && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading images...
            </div>
          </div>
        )}

        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{uploadError}</p>
          </div>
        )}

        {/* Image Preview Grid */}
        {formData.images && formData.images.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Uploaded Images</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {formData.images.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Business image ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                  {index === 0 && (
                    <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Main
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Hours of Operation
        </label>
        <div className="space-y-3">
          {Object.entries(DEFAULT_HOURS).map(([day, hours]) => (
            <div key={day} className="flex items-center space-x-4">
              <div className="w-20 text-sm font-medium text-gray-700 capitalize">
                {day}
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={!formData.hoursOfOperation?.[day]?.closed}
                  onChange={(e) => {
                    const newHours = {
                      ...formData.hoursOfOperation,
                      [day]: {
                        ...formData.hoursOfOperation?.[day],
                        closed: !e.target.checked,
                        open: e.target.checked ? (formData.hoursOfOperation?.[day]?.open || '09:00') : '',
                        close: e.target.checked ? (formData.hoursOfOperation?.[day]?.close || '17:00') : '',
                      }
                    };
                    onChange('hoursOfOperation', newHours);
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600">Open</span>
              </label>
              {!formData.hoursOfOperation?.[day]?.closed && (
                <>
                  <input
                    type="time"
                    value={formData.hoursOfOperation?.[day]?.open || ''}
                    onChange={(e) => {
                      const newHours = {
                        ...formData.hoursOfOperation,
                        [day]: {
                          ...formData.hoursOfOperation?.[day],
                          open: e.target.value,
                        }
                      };
                      onChange('hoursOfOperation', newHours);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={formData.hoursOfOperation?.[day]?.close || ''}
                    onChange={(e) => {
                      const newHours = {
                        ...formData.hoursOfOperation,
                        [day]: {
                          ...formData.hoursOfOperation?.[day],
                          close: e.target.value,
                        }
                      };
                      onChange('hoursOfOperation', newHours);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </>
              )}
              {formData.hoursOfOperation?.[day]?.closed && (
                <span className="text-sm text-gray-500">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailsCategoriesStep({ formData, onChange }: StepProps) {
  const handleArrayInput = (field: keyof CreateListingInput, value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    onChange(field, items);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Categories *
        </label>
        <input
          type="text"
          value={formData.categories?.join(', ') || ''}
          onChange={(e) => handleArrayInput('categories', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Restaurant, Italian, Fine Dining (comma-separated)"
        />
        <p className="text-sm text-gray-500 mt-1">
          Enter categories that best describe your business, separated by commas.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <input
          type="text"
          value={formData.tags?.join(', ') || ''}
          onChange={(e) => handleArrayInput('tags', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., family-friendly, outdoor-seating, takeout (comma-separated)"
        />
        <p className="text-sm text-gray-500 mt-1">
          Add tags to help customers find specific features or services.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Features
        </label>
        <input
          type="text"
          value={formData.features?.join(', ') || ''}
          onChange={(e) => handleArrayInput('features', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., WiFi, Parking, Wheelchair Accessible (comma-separated)"
        />
        <p className="text-sm text-gray-500 mt-1">
          List key features and services your business offers.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Amenities
        </label>
        <input
          type="text"
          value={formData.amenities?.join(', ') || ''}
          onChange={(e) => handleArrayInput('amenities', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Air Conditioning, Pet Friendly, Credit Cards Accepted (comma-separated)"
        />
        <p className="text-sm text-gray-500 mt-1">
          Add amenities that make your business stand out.
        </p>
      </div>
    </div>
  );
}

function ReviewSubmitStep({ formData }: { formData: CreateListingInput }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Review Your Listing</h3>
        <p className="text-blue-700 text-sm">
          Please review all information below. Your listing will be submitted for review and published once approved.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900">Basic Information</h4>
            <div className="mt-2 text-sm text-gray-600">
              <p><strong>Name:</strong> {formData.name}</p>
              <p><strong>Description:</strong> {formData.description}</p>
              {formData.pricingRange && (
                <p><strong>Pricing:</strong> {formData.pricingRange}</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900">Location</h4>
            <div className="mt-2 text-sm text-gray-600">
              <p>{formData.street}</p>
              <p>{formData.city}, {formData.state} {formData.zipCode}</p>
              <p>{formData.country}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900">Contact Information</h4>
            <div className="mt-2 text-sm text-gray-600">
              {formData.phone && <p><strong>Phone:</strong> {formData.phone}</p>}
              {formData.email && <p><strong>Email:</strong> {formData.email}</p>}
              {formData.website && <p><strong>Website:</strong> {formData.website}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900">Categories & Tags</h4>
            <div className="mt-2 text-sm text-gray-600">
              {formData.categories && formData.categories.length > 0 && (
                <p><strong>Categories:</strong> {formData.categories.join(', ')}</p>
              )}
              {formData.tags && formData.tags.length > 0 && (
                <p><strong>Tags:</strong> {formData.tags.join(', ')}</p>
              )}
              {formData.features && formData.features.length > 0 && (
                <p><strong>Features:</strong> {formData.features.join(', ')}</p>
              )}
              {formData.amenities && formData.amenities.length > 0 && (
                <p><strong>Amenities:</strong> {formData.amenities.join(', ')}</p>
              )}
            </div>
          </div>

          {formData.images && formData.images.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900">Images ({formData.images.length})</h4>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {formData.images.slice(0, 6).map((imageUrl, index) => (
                  <img
                    key={index}
                    src={imageUrl}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-16 object-cover rounded border"
                  />
                ))}
                {formData.images.length > 6 && (
                  <div className="w-full h-16 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-500">
                    +{formData.images.length - 6} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Submission Review Process
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Your listing will be reviewed by our team before being published. This typically takes 1-2 business days. 
                You'll receive an email notification once your listing is approved and live on the site.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}