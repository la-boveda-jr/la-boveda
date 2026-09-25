import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import parse from 'html-react-parser';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
    Settings, CheckCircle, ArrowLeft, ArrowRight, X, Image, File, MapPin,
    Youtube, Move, AlertCircle, Banknote, Tag
} from "lucide-react";
import { RTE, AdminContainer, AdminHeader, AdminSidebar } from '../../components';
import toast from 'react-hot-toast';
import axiosInstance from '../../utils/axiosInstance.js';
import { useNavigate } from 'react-router-dom';

const ItemTypes = { PHOTO: 'photo' };

const DraggablePhoto = ({ photo, index, movePhoto, removePhoto }) => {
    const [, ref] = useDrag({ type: ItemTypes.PHOTO, item: { index } });
    const [, drop] = useDrop({
        accept: ItemTypes.PHOTO,
        hover: (draggedItem) => {
            if (draggedItem.index !== index) {
                movePhoto(draggedItem.index, index);
                draggedItem.index = index;
            }
        },
    });
    return (
        <div ref={(node) => ref(drop(node))} className="relative group">
            <img src={URL.createObjectURL(photo)} alt={`Upload ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg cursor-move" />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                <Move size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
            <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                {index + 1}
            </div>
            <button type="button" onClick={() => removePhoto(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors">
                <X size={14} />
            </button>
        </div>
    );
};

const PhotoGallery = ({ photos, movePhoto, removePhoto }) => (
    <div className="mt-4">
        <p className="text-sm text-secondary mb-3">
            Drag and drop to reorder photos. The first image will be the main thumbnail.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo, index) => (
                <DraggablePhoto key={`photo-${index}`} photo={photo} index={index}
                    movePhoto={movePhoto} removePhoto={removePhoto} />
            ))}
        </div>
    </div>
);

const UploadProgressModal = ({ isOpen, fileCount }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                <div className="flex items-center mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mr-3"></div>
                    <h3 className="text-lg font-semibold">Creating Your Product</h3>
                </div>
                <div className="space-y-3">
                    <p className="text-gray-600">We're uploading {fileCount} file(s) to our secure cloud storage.</p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                            ⏳ <strong>Please be patient:</strong> Large files may take several minutes to upload depending on your internet speed.
                        </p>
                    </div>
                    <p className="text-xs text-gray-500 text-center">Do not close this window until the process is complete.</p>
                </div>
            </div>
        </div>
    );
};

const DynamicField = ({ field, register, errors }) => {
    const fieldName = `specifications.${field.name}`;
    const error = errors.specifications?.[field.name];
    const fieldLabel = field.label || field.name || 'Field';
    const fieldPlaceholder = field.placeholder || `Enter ${fieldLabel.toLowerCase()}`;
    const inputClasses = `w-full p-3 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-black focus:border-transparent`;
    const unitText = field.unit ? ` (${field.unit})` : '';
    const InheritanceBadge = field.source === 'inherited' ? (
        <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            Inherited from {field.sourceCategory?.name}
        </span>
    ) : null;

    switch (field.fieldType) {
        case 'textarea':
            return (
                <div className="space-y-2">
                    <div className="flex items-center">
                        <label className="block text-sm font-medium text-gray-700">
                            {fieldLabel} {field.required && <span className="text-red-500">*</span>}{unitText}
                        </label>
                        {InheritanceBadge}
                    </div>
                    <textarea {...register(fieldName, { required: field.required ? `${fieldLabel} is required` : false })}
                        rows={3} placeholder={fieldPlaceholder} className={inputClasses} />
                    {error && <p className="text-red-500 text-sm">{error.message}</p>}
                </div>
            );
        case 'select':
            return (
                <div className="space-y-2">
                    <div className="flex items-center">
                        <label className="block text-sm font-medium text-gray-700">
                            {fieldLabel} {field.required && <span className="text-red-500">*</span>}{unitText}
                        </label>
                        {InheritanceBadge}
                    </div>
                    <select {...register(fieldName, { required: field.required ? `${fieldLabel} is required` : false })}
                        className={inputClasses}>
                        <option value="">Select {fieldLabel}</option>
                        {field.options?.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    {error && <p className="text-red-500 text-sm">{error.message}</p>}
                </div>
            );
        case 'number':
            return (
                <div className="space-y-2">
                    <div className="flex items-center">
                        <label className="block text-sm font-medium text-gray-700">
                            {fieldLabel} {field.required && <span className="text-red-500">*</span>}{unitText}
                        </label>
                        {InheritanceBadge}
                    </div>
                    <input {...register(fieldName, { required: field.required ? `${fieldLabel} is required` : false })}
                        type="number" step="any" placeholder={fieldPlaceholder} className={inputClasses} />
                    {error && <p className="text-red-500 text-sm">{error.message}</p>}
                </div>
            );
        case 'date':
            return (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {fieldLabel} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <input {...register(fieldName, { required: field.required ? `${fieldLabel} is required` : false })}
                        type="date" className={inputClasses} />
                    {error && <p className="text-red-500 text-sm">{error.message}</p>}
                </div>
            );
        case 'boolean':
            return (
                <div className="space-y-2">
                    <div className="flex items-center">
                        <input {...register(fieldName)} type="checkbox"
                            className="h-4 w-4 text-black rounded focus:ring-black border-gray-300" />
                        <label className="ml-2 block text-sm text-gray-700">
                            {fieldLabel} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {InheritanceBadge}
                    </div>
                    {error && <p className="text-red-500 text-sm">{error.message}</p>}
                </div>
            );
        default:
            return (
                <div className="space-y-2">
                    <div className="flex items-center">
                        <label className="block text-sm font-medium text-gray-700">
                            {fieldLabel} {field.required && <span className="text-red-500">*</span>}{unitText}
                        </label>
                        {InheritanceBadge}
                    </div>
                    <input {...register(fieldName, { required: field.required ? `${fieldLabel} is required` : false })}
                        type="text" placeholder={fieldPlaceholder} className={inputClasses} />
                    {error && <p className="text-red-500 text-sm">{error.message}</p>}
                </div>
            );
    }
};

const CreateProduct = () => {
    const [step, setStep] = useState(1);
    const [uploadedPhotos, setUploadedPhotos] = useState([]);
    const [uploadedDocuments, setUploadedDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const [parentCategories, setParentCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [selectedParent, setSelectedParent] = useState(null);
    const [categoryFields, setCategoryFields] = useState([]);
    const [loadingFields, setLoadingFields] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(true);

    const {
        register, handleSubmit, watch, setValue, setError, clearErrors,
        trigger, getValues, reset, control,
        formState: { errors }
    } = useForm({
        mode: 'onChange',
        defaultValues: { auctionType: 'buy_now', categories: [] }
    });

    const selectedCategory = watch('category');
    const selectedParentSlug = watch('parentCategory');

    useEffect(() => { fetchParentCategories(); }, []);

    useEffect(() => {
        if (selectedParentSlug) {
            fetchSubCategories(selectedParentSlug);
            setValue('category', '');
            setCategoryFields([]);
        }
    }, [selectedParentSlug]);

    useEffect(() => {
        if (selectedCategory) fetchCategoryFields(selectedCategory);
        else setCategoryFields([]);
    }, [selectedCategory]);

    const fetchParentCategories = async () => {
        try {
            setLoadingCategories(true);
            const { data } = await axiosInstance.get('/api/v1/categories/public/parents');
            if (data.success) setParentCategories(data.data);
        } catch (error) { toast.error('Failed to load categories'); }
        finally { setLoadingCategories(false); }
    };

    const fetchSubCategories = async (parentSlug) => {
        try {
            setLoadingCategories(true);
            const { data } = await axiosInstance.get(`/api/v1/categories/public/${parentSlug}/children`);
            if (data.success) {
                setSubCategories(data.data.subcategories);
                setSelectedParent(data.data.parent);
            }
        } catch (error) { toast.error('Failed to load subcategories'); setSubCategories([]); }
        finally { setLoadingCategories(false); }
    };

    const fetchCategoryFields = async (slug) => {
        try {
            setLoadingFields(true);
            const { data } = await axiosInstance.get(`/api/v1/categories/public/by-slug/${slug}/fields`);
            if (data.success) setCategoryFields(data.data.fields || []);
        } catch (error) { setCategoryFields([]); }
        finally { setLoadingFields(false); }
    };

    const movePhoto = (fromIndex, toIndex) => {
        const updatedPhotos = [...uploadedPhotos];
        const [movedPhoto] = updatedPhotos.splice(fromIndex, 1);
        updatedPhotos.splice(toIndex, 0, movedPhoto);
        setUploadedPhotos(updatedPhotos);
    };

    const groupedFields = categoryFields.reduce((acc, field) => {
        const group = field.group || 'General';
        if (!acc[group]) acc[group] = [];
        acc[group].push(field);
        return acc;
    }, {});

    const renderCategoryFields = () => {
        if (loadingFields) {
            return (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    <span className="ml-3 text-gray-600">Loading fields...</span>
                </div>
            );
        }
        if (categoryFields.length === 0) {
            return (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <AlertCircle size={40} className="mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No Custom Fields</h3>
                    <p className="text-gray-500">This category doesn't have any specific fields configured.</p>
                </div>
            );
        }
        return (
            <div className="space-y-8">
                {Object.entries(groupedFields).map(([groupName, fields]) => (
                    <div key={groupName} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <h3 className="font-medium text-gray-700">{groupName}</h3>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {fields.sort((a, b) => a.order - b.order).map((field) => {
                                    const uniqueKey = `${field.source || 'own'}-${field._id || field.name}-${selectedCategory}`;
                                    return <DynamicField key={uniqueKey} field={field} register={register} errors={errors} />;
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const nextStep = async () => {
        let isValid = true;
        scrollTo({ top: 0, behavior: 'smooth' });

        if (step === 1) {
            const fieldsToValidate = ['title', 'description', 'parentCategory', 'category'];
            categoryFields.forEach(field => {
                if (field.required) fieldsToValidate.push(`specifications.${field.name}`);
            });
            const overallValidationPassed = await trigger(fieldsToValidate);
            if (!overallValidationPassed) isValid = false;

            if (uploadedPhotos.length === 0) {
                setError('photos', { type: 'manual', message: 'At least one photo is required' });
                isValid = false;
            } else clearErrors('photos');
        }

        if (step === 2) {
            const overallValidationPassed = await trigger(['price']);
            if (!overallValidationPassed) isValid = false;
        }

        if (!isValid) return;
        setStep(step + 1);
    };

    const prevStep = () => {
        setStep(step - 1);
        scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePhotoUpload = (e) => {
        const files = Array.from(e.target.files);
        setUploadedPhotos([...files, ...uploadedPhotos]);
        clearErrors('photos');
    };

    const handleDocumentUpload = (e) => {
        const files = Array.from(e.target.files);
        setUploadedDocuments([...uploadedDocuments, ...files]);
    };

    const removePhoto = (index) => {
        const newPhotos = uploadedPhotos.filter((_, i) => i !== index);
        setUploadedPhotos(newPhotos);
        if (newPhotos.length === 0) {
            setError('photos', { type: 'manual', message: 'At least one photo is required' });
        } else clearErrors('photos');
    };

    const removeDocument = (index) => {
        setUploadedDocuments(uploadedDocuments.filter((_, i) => i !== index));
    };

    const createProductHandler = async (formData) => {
        try {
            setIsLoading(true);
            const fd = new FormData();

            fd.append('title', formData.title);
            fd.append('description', formData.description);
            fd.append('location', formData.location || '');
            fd.append('videoLink', formData.video || '');

            const categoriesToStore = [];
            if (formData.parentCategory) categoriesToStore.push(formData.parentCategory);
            if (formData.category) categoriesToStore.push(formData.category);
            fd.append('categories', JSON.stringify(categoriesToStore));

            fd.append('auctionType', 'buy_now');
            fd.append('features', formData.features || '');
            fd.append('startPrice', formData.price);
            fd.append('buyNowPrice', formData.price);

            if (formData.specifications) {
                fd.append('specifications', JSON.stringify(formData.specifications));
            }

            uploadedPhotos.forEach(photo => fd.append('photos', photo));
            uploadedDocuments.forEach(doc => fd.append('documents', doc));

            const { data } = await axiosInstance.post('/api/v1/auctions/create', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data && data.success) {
                toast.success(data.message);
                reset();
                navigate('/admin/products/all');
            }
        } catch (error) {
            const msg = error?.response?.data?.message || 'Failed to create product';
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <section className="flex min-h-[70vh]">
                <AdminSidebar />
                <UploadProgressModal isOpen={isLoading}
                    fileCount={uploadedPhotos.length + uploadedDocuments.length} />

                <div className="w-full relative">
                    <AdminHeader />
                    <AdminContainer>
                        <div className="pt-16 md:py-7">
                            <h1 className="text-3xl md:text-4xl font-bold mb-5">Create Product</h1>

                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    {['Item Info', 'Pricing', 'Review & Submit'].map((label, index) => (
                                        <div key={index} className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step > index + 1 ? 'bg-green-500 text-white' :
                                                step === index + 1 ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                {step > index + 1 ? <CheckCircle size={20} /> : index + 1}
                                            </div>
                                            <span className="text-sm mt-2 hidden md:block">{label}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="w-full bg-gray-200 h-3 rounded-full">
                                    <div className="bg-black h-3 rounded-full transition-all duration-300"
                                        style={{ width: `${(step / 3) * 100}%` }}></div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit(createProductHandler)}
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">

                                {step === 1 && (
                                    <div>
                                        <h2 className="text-xl font-semibold mb-6">Item Details</h2>
                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-secondary mb-1">Item Name *</label>
                                            <input {...register('title', { required: 'Item name is required' })}
                                                type="text"
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                                placeholder="e.g., 1985 Star Co. Michael Jordan #117 BGS Gem Mint 9.5" />
                                            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1">Category *</label>
                                                <select {...register('parentCategory', { required: 'Please select a category' })}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                                    disabled={loadingCategories}>
                                                    <option value="">Select a category</option>
                                                    {parentCategories.map(cat => (
                                                        <option key={cat._id} value={cat.slug}>{cat.name}</option>
                                                    ))}
                                                </select>
                                                {errors.parentCategory && <p className="text-red-500 text-sm mt-1">{errors.parentCategory.message}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1">Subcategory *</label>
                                                <select {...register('category', { required: 'Please select a subcategory' })}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                                    disabled={!selectedParentSlug || loadingCategories}>
                                                    <option value="">Select a subcategory</option>
                                                    {subCategories.map(sub => (
                                                        <option key={sub._id} value={sub.slug}>{sub.name}</option>
                                                    ))}
                                                </select>
                                                {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>}
                                            </div>
                                        </div>

                                        {selectedCategory && (
                                            <div className="mb-6">
                                                <div className="mb-4 pb-2 border-b border-gray-200">
                                                    <h3 className="text-lg font-medium text-gray-800">
                                                        {selectedParent?.name} - {subCategories.find(s => s.slug === selectedCategory)?.name || 'Category'} Specifications
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mt-1">Please provide the following details about your item</p>
                                                </div>
                                                {renderCategoryFields()}
                                            </div>
                                        )}

                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-secondary mb-1">Description *</label>
                                            <RTE name="description" control={control} label="Description:"
                                                defaultValue={getValues('description') || ''}
                                                placeholder="Describe the item's history, condition, and any notable details..." />
                                            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1">Location</label>
                                                <div className="relative">
                                                    <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                                    <input {...register('location')} type="text"
                                                        className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                                        placeholder="e.g., Altamira, Caracas, Venezuela" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1">Video Link</label>
                                                <div className="relative">
                                                    <Youtube size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                                    <input {...register('video', {
                                                        pattern: {
                                                            value: /^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/,
                                                            message: 'Please enter a valid YouTube URL'
                                                        }
                                                    })} type="url"
                                                        className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                                        placeholder="YouTube video URL" />
                                                </div>
                                                {errors.video && <p className="text-red-500 text-sm mt-1">{errors.video.message}</p>}
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-secondary mb-1">Attach Photos *</label>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                                <input type="file" multiple accept="image/*"
                                                    onChange={handlePhotoUpload} className="hidden" id="photo-upload" />
                                                <label htmlFor="photo-upload" className="cursor-pointer">
                                                    <Image size={40} className="mx-auto text-gray-400 mb-2" />
                                                    <p className="text-gray-600">Browse photo(s) to upload</p>
                                                </label>
                                            </div>
                                            {errors.photos && <p className="text-red-500 text-sm mt-1">{errors.photos.message}</p>}
                                            {uploadedPhotos.length > 0 && (
                                                <PhotoGallery photos={uploadedPhotos} movePhoto={movePhoto} removePhoto={removePhoto} />
                                            )}
                                        </div>

                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-secondary mb-1">Attach Documents</label>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                                <input type="file" multiple onChange={handleDocumentUpload}
                                                    className="hidden" id="document-upload" />
                                                <label htmlFor="document-upload" className="cursor-pointer">
                                                    <File size={40} className="mx-auto text-gray-400 mb-2" />
                                                    <p className="text-gray-600">Browse document(s) to upload</p>
                                                </label>
                                            </div>
                                            {uploadedDocuments.length > 0 && (
                                                <div className="mt-4 space-y-2">
                                                    {uploadedDocuments.map((doc, index) => (
                                                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                                            <span className="text-sm truncate">{doc.name}</span>
                                                            <button type="button" onClick={() => removeDocument(index)} className="text-red-500">
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div>
                                        <h2 className="text-xl font-semibold mb-6 flex items-center">
                                            <Banknote size={20} className="mr-2" />Product Pricing
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1">Price *</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600">$</span>
                                                    <input {...register('price', {
                                                        required: 'Price is required',
                                                        min: { value: 0, message: 'Price must be positive' }
                                                    })} type="number" step="0.01" min="0"
                                                        className="w-full pl-8 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                                        placeholder="0.00" />
                                                </div>
                                                {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
                                                <p className="text-sm text-secondary mt-1">
                                                    Buyers can purchase immediately at this price.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div>
                                        <h2 className="text-xl font-semibold mb-6 flex items-center">
                                            <Settings size={20} className="mr-2" />Review & Submit
                                        </h2>
                                        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
                                            <h3 className="font-medium text-lg mb-4 border-b pb-2">Product Summary</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                                        <h4 className="font-medium mb-3">Item Details</h4>
                                                        <div className="space-y-2">
                                                            <div>
                                                                <p className="text-xs text-secondary">Item Name</p>
                                                                <p className="font-medium">{watch('title') || 'Not provided'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-secondary">Category</p>
                                                                <p className="font-medium">
                                                                    {selectedParent?.name}
                                                                    {selectedCategory && ` / ${subCategories.find(s => s.slug === selectedCategory)?.name || selectedCategory}`}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-secondary">Location</p>
                                                                <p className="font-medium">{watch('location') || 'Not specified'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {categoryFields.length > 0 && (
                                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                                            <h4 className="font-medium mb-3">Specifications</h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {categoryFields.map((field) => {
                                                                    const value = watch(`specifications.${field.name}`);
                                                                    if (!value && value !== 0 && value !== false) return null;
                                                                    return (
                                                                        <div key={field.name}>
                                                                            <p className="text-xs text-secondary">{field.label}</p>
                                                                            <p className="font-medium">{String(value)}</p>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                                        <h4 className="font-medium mb-3">Product Details</h4>
                                                        <div className="space-y-2">
                                                            <div>
                                                                <p className="text-xs text-secondary">Type</p>
                                                                <p className="font-medium">Buy Now Product</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-secondary">Price</p>
                                                                <p className="font-medium text-green-600">${watch('price') || '0.00'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                                        <h4 className="font-medium mb-3">Media & Documents</h4>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <p className="text-xs text-secondary">Photos</p>
                                                                <span className="font-medium bg-gray-100 px-2 py-1 rounded-full text-xs">
                                                                    {uploadedPhotos.length} uploaded
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <p className="text-xs text-secondary">Documents</p>
                                                                <span className="font-medium bg-gray-100 px-2 py-1 rounded-full text-xs">
                                                                    {uploadedDocuments.length} uploaded
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white p-4 rounded-lg shadow-sm mt-4">
                                                <h4 className="font-medium text-black mb-3">Description Preview</h4>
                                                <div className="prose prose-lg max-w-none border rounded-lg p-4 bg-gray-50">
                                                    {watch('description') ? parse(watch('description')) :
                                                        <p className="text-gray-500 italic">No description provided</p>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <label className="flex items-start">
                                                <input type="checkbox" {...register('termsAgreed', { required: 'You must agree to the terms' })}
                                                    className="mt-1 mr-2" />
                                                <span className="text-sm font-medium text-secondary">
                                                    I agree to the terms and conditions and confirm that I have the right to sell this item
                                                </span>
                                            </label>
                                            {errors.termsAgreed && <p className="text-red-500 text-sm mt-1">{errors.termsAgreed.message}</p>}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between mt-8">
                                    {step > 1 ? (
                                        <button type="button" onClick={prevStep}
                                            className="flex items-center px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">
                                            <ArrowLeft size={18} className="mr-2" />Previous
                                        </button>
                                    ) : <div></div>}

                                    {step < 3 ? (
                                        <button type="button" onClick={(e) => { e.preventDefault(); nextStep(); }}
                                            className="flex items-center px-6 py-2 bg-[#C59D55] text-white hover:bg-[#C59D55]/90 rounded-lg transition-colors">
                                            Next<ArrowRight size={18} className="ml-2" />
                                        </button>
                                    ) : (
                                        <button type="submit"
                                            className="flex items-center px-6 py-2 bg-[#C59D55] text-white hover:bg-[#C59D55]/90 rounded-lg transition-colors">
                                            <Tag size={18} className="mr-2" />
                                            {isLoading ? 'Creating Product...' : 'Create Product'}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </AdminContainer>
                </div>
            </section>
        </DndProvider>
    );
};

export default CreateProduct;