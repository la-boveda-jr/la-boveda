import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import parse from 'html-react-parser';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
    FileText, Settings, CheckCircle, ArrowLeft, ArrowRight, X, Image, File,
    MapPin, Youtube, Move, AlertCircle, Banknote, Tag
} from "lucide-react";
import { RTE, SellerContainer, SellerHeader, SellerSidebar } from '../../components';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosInstance from '../../utils/axiosInstance';

const ItemTypes = { PHOTO: 'photo' };

const DraggablePhoto = ({ photo, index, movePhoto, removePhoto }) => {
    const ref = useRef(null);
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.PHOTO, item: { type: ItemTypes.PHOTO, index },
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });
    const [, drop] = useDrop({
        accept: ItemTypes.PHOTO,
        hover(item, monitor) {
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;
            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;
            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
            movePhoto(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });
    drag(drop(ref));

    return (
        <div className="space-y-2">
            <div ref={ref}
                style={{ opacity: isDragging ? 0.5 : 1, cursor: isDragging ? 'grabbing' : 'grab' }}
                className="relative group transition-all duration-200">
                <img src={photo.isExisting ? photo.url : URL.createObjectURL(photo.file)}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2 border-transparent hover:border-blue-500" />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <Move size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
                <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                    {index + 1}
                </div>
                <div className="absolute top-2 right-2 bg-blue-500 bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                    {photo.isExisting ? 'Existing' : 'New'}
                </div>
                <button type="button" onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-10">
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

const PhotoGallery = ({ photos, movePhoto, removePhoto }) => (
    <div className="mt-4">
        <p className="text-sm text-secondary mb-3">
            Drag and drop to reorder photos. The first image will be the main thumbnail.
            <span className="block text-xs text-gray-500 mt-1">Blue badge indicates existing photos</span>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo, index) => (
                <DraggablePhoto key={photo.id} photo={photo} index={index}
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                    <h3 className="text-lg font-semibold">Updating Your Product</h3>
                </div>
                <div className="space-y-3">
                    <p className="text-gray-600">
                        {fileCount > 0 ? `We're uploading ${fileCount} file(s).` : 'Updating your product details.'}
                    </p>
                    {fileCount > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                                ⏳ <strong>Please be patient:</strong> Large files may take several minutes.
                            </p>
                        </div>
                    )}
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

    const renderInput = () => {
        switch (field.fieldType) {
            case 'textarea':
                return <textarea {...register(fieldName, { required: field.required ? `${fieldLabel} is required` : false })}
                    rows={3} placeholder={fieldPlaceholder} className={inputClasses} />;
            case 'select':
                return <select {...register(fieldName, { required: field.required ? `${fieldLabel} is required` : false })} className={inputClasses}>
                    <option value="">Select {fieldLabel}</option>
                    {field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>;
            case 'number':
                return <input {...register(fieldName, { required: field.required ? `${fieldLabel} is required` : false })}
                    type="number" step="any" placeholder={fieldPlaceholder} className={inputClasses} />;
            case 'date':
                return <input {...register(fieldName, { required: field.required ? `${fieldLabel} is required` : false })}
                    type="date" className={inputClasses} />;
            case 'boolean':
                return (
                    <div className="flex items-center">
                        <input {...register(fieldName)} type="checkbox"
                            className="h-4 w-4 text-black rounded focus:ring-black border-gray-300" />
                        <label className="ml-2 block text-sm text-gray-700">{fieldLabel}</label>
                        {InheritanceBadge}
                    </div>
                );
            default:
                return <input {...register(fieldName, { required: field.required ? `${fieldLabel} is required` : false })}
                    type="text" placeholder={fieldPlaceholder} className={inputClasses} />;
        }
    };

    if (field.fieldType === 'boolean') {
        return (
            <div className="space-y-2">
                {renderInput()}
                {error && <p className="text-red-500 text-sm">{error.message}</p>}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center">
                <label className="block text-sm font-medium text-gray-700">
                    {fieldLabel} {field.required && <span className="text-red-500">*</span>}{unitText}
                </label>
                {InheritanceBadge}
            </div>
            {renderInput()}
            {error && <p className="text-red-500 text-sm">{error.message}</p>}
        </div>
    );
};

const EditProduct = () => {
    const [step, setStep] = useState(1);
    const [allPhotos, setAllPhotos] = useState([]);
    const [uploadedDocuments, setUploadedDocuments] = useState([]);
    const [existingDocuments, setExistingDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [removedPhotos, setRemovedPhotos] = useState([]);
    const [removedDocuments, setRemovedDocuments] = useState([]);
    const [parentCategories, setParentCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [selectedParent, setSelectedParent] = useState(null);
    const [categoryFields, setCategoryFields] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [loadingFields, setLoadingFields] = useState(false);

    const newPhotos = allPhotos.filter(photo => !photo.isExisting);
    const hasNewUploads = newPhotos.length > 0 || uploadedDocuments.length > 0;
    const totalNewFiles = newPhotos.length + uploadedDocuments.length;

    const { productId } = useParams();
    const navigate = useNavigate();

    const {
        register, handleSubmit, watch, setValue, setError, clearErrors,
        trigger, getValues, control, reset,
        formState: { errors }
    } = useForm({ mode: 'onChange', defaultValues: { auctionType: 'buy_now' } });

    const selectedCategory = watch('category');

    const fetchParentCategories = async () => {
        try {
            setLoadingCategories(true);
            const { data } = await axiosInstance.get('/api/v1/categories/public/parents');
            if (data.success) setParentCategories(data.data);
        } catch (error) { console.error(error); }
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
        } catch (error) { setSubCategories([]); }
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

    useEffect(() => { fetchParentCategories(); }, []);

    const movePhoto = useCallback((dragIndex, hoverIndex) => {
        setAllPhotos(prev => {
            const updated = [...prev];
            const [moved] = updated.splice(dragIndex, 1);
            updated.splice(hoverIndex, 0, moved);
            return updated;
        });
    }, []);

    const mapToObject = (map) => {
        if (!map) return {};
        if (map instanceof Map) {
            const obj = {};
            map.forEach((value, key) => { obj[key] = value; });
            return obj;
        }
        return map;
    };

    useEffect(() => {
        const fetchProductData = async () => {
            try {
                setIsLoading(true);
                // Seller uses public endpoint
                const { data } = await axiosInstance.get(`/api/v1/auctions/${productId}`);

                if (data.success) {
                    const product = data.data.auction;

                    if (product.auctionType !== 'buy_now') {
                        toast.error('This is not a product');
                        navigate('/seller/products/all');
                        return;
                    }

                    const specificationsObj = mapToObject(product.specifications);

                    const categories = product.categories || [];
                    let parentSlug = null;
                    let subCategorySlug = null;
                    if (categories.length >= 2) {
                        parentSlug = categories[0];
                        subCategorySlug = categories[1];
                    } else if (categories.length === 1) {
                        subCategorySlug = categories[0];
                    }

                    if (parentSlug) await fetchSubCategories(parentSlug);
                    if (subCategorySlug) await fetchCategoryFields(subCategorySlug);

                    reset({
                        title: product.title,
                        parentCategory: parentSlug || '',
                        category: subCategorySlug || '',
                        features: product.features || '',
                        description: product.description,
                        location: product.location,
                        video: product.videoLink,
                        price: product.buyNowPrice || product.startPrice,
                        auctionType: 'buy_now',
                    });

                    if (subCategorySlug) {
                        setTimeout(() => {
                            Object.entries(specificationsObj).forEach(([key, value]) => {
                                setValue(`specifications.${key}`, value, {
                                    shouldValidate: true, shouldDirty: false, shouldTouch: false
                                });
                            });
                        }, 100);
                    }

                    const existingPhotosWithFlag = (product.photos || []).map(photo => ({
                        ...photo, isExisting: true, id: photo.publicId || photo._id, url: photo.url
                    }));
                    setAllPhotos(existingPhotosWithFlag);
                    setExistingDocuments(product.documents || []);

                    toast.success('Product data loaded successfully');
                }
            } catch (error) {
                toast.error('Failed to load product data');
                navigate('/seller/products/all');
            } finally {
                setIsLoading(false);
            }
        };

        if (productId) fetchProductData();
    }, [productId, reset, setValue, navigate]);

    useEffect(() => {
        const parentSlug = watch('parentCategory');
        if (parentSlug) {
            fetchSubCategories(parentSlug);
            setValue('category', '');
            setCategoryFields([]);
        }
    }, [watch('parentCategory')]);

    useEffect(() => {
        const subCategorySlug = watch('category');
        if (subCategorySlug) fetchCategoryFields(subCategorySlug);
    }, [watch('category')]);

    const nextStep = async () => {
        let isValid = true;
        scrollTo({ top: 0, behavior: 'smooth' });

        if (step === 1) {
            const fieldsToValidate = ['title', 'category', 'description'];
            categoryFields.forEach(field => {
                if (field.required) fieldsToValidate.push(`specifications.${field.name}`);
            });
            const passed = await trigger(fieldsToValidate);
            if (!passed) isValid = false;

            if (allPhotos.length === 0) {
                setError('photos', { type: 'manual', message: 'At least one photo is required' });
                isValid = false;
            } else clearErrors('photos');
        }

        if (step === 2) {
            const passed = await trigger(['price']);
            if (!passed) isValid = false;
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
        if (files.length === 0) return;
        const newPhotos = files.map(file => {
            const fileId = `${file.name}-${file.size}-${file.lastModified}`;
            const uniqueId = `new-${Date.now()}-${fileId.replace(/[^a-zA-Z0-9]/g, '-')}`;
            return {
                file, isExisting: false, id: uniqueId,
                _fileSignature: `${file.name}-${file.size}-${file.lastModified}`
            };
        });
        const existingSignatures = new Set(allPhotos.filter(p => !p.isExisting).map(p => p._fileSignature));
        const uniqueNewPhotos = newPhotos.filter(p => !existingSignatures.has(p._fileSignature));
        if (uniqueNewPhotos.length === 0) { toast.error('Some photos are already added'); return; }
        setAllPhotos(prev => [...uniqueNewPhotos, ...prev]);
        clearErrors('photos');
        e.target.value = '';
    };

    const removePhoto = (index) => {
        const photoToRemove = allPhotos[index];
        if (photoToRemove.isExisting) setRemovedPhotos(prev => [...prev, photoToRemove.id]);
        setAllPhotos(prev => prev.filter((_, i) => i !== index));
        if (allPhotos.length === 1) {
            setError('photos', { type: 'manual', message: 'At least one photo is required' });
        }
    };

    const handleDocumentUpload = (e) => {
        const files = Array.from(e.target.files);
        setUploadedDocuments([...uploadedDocuments, ...files]);
    };

    const removeDocument = (index, isExisting = false) => {
        if (isExisting) {
            const removedDoc = existingDocuments[index];
            setRemovedDocuments(prev => [...prev, removedDoc.publicId || removedDoc._id]);
            setExistingDocuments(existingDocuments.filter((_, i) => i !== index));
        } else {
            setUploadedDocuments(uploadedDocuments.filter((_, i) => i !== index));
        }
    };

    const updateProductHandler = async (formData) => {
        try {
            setIsSubmitting(true);
            const fd = new FormData();

            fd.append('title', formData.title);

            const categoriesToStore = [];
            if (formData.parentCategory) categoriesToStore.push(formData.parentCategory);
            if (formData.category) categoriesToStore.push(formData.category);
            fd.append('categories', JSON.stringify(categoriesToStore));

            fd.append('features', formData.features || '');
            fd.append('description', formData.description);
            fd.append('location', formData.location || '');
            fd.append('videoLink', formData.video || '');
            fd.append('auctionType', 'buy_now');
            fd.append('startPrice', formData.price);
            fd.append('buyNowPrice', formData.price);

            if (formData.specifications && Object.keys(formData.specifications).length > 0) {
                fd.append('specifications', JSON.stringify(formData.specifications));
            }

            if (removedPhotos.length > 0) fd.append('removedPhotos', JSON.stringify(removedPhotos));
            if (removedDocuments.length > 0) fd.append('removedDocuments', JSON.stringify(removedDocuments));

            const photoOrder = allPhotos.map(p => ({ id: p.id, isExisting: p.isExisting }));
            fd.append('photoOrder', JSON.stringify(photoOrder));

            allPhotos.forEach(photo => {
                if (!photo.isExisting && photo.file) fd.append('photos', photo.file);
            });

            uploadedDocuments.forEach(doc => fd.append('documents', doc));

            // Seller endpoint
            const { data } = await axiosInstance.put(
                `/api/v1/auctions/update/${productId}`,
                fd,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            if (data.success) {
                toast.success('Product updated successfully!');
                navigate('/seller/products/all');
            } else {
                throw new Error(data.message || 'Failed to update product');
            }
        } catch (error) {
            const msg = error?.response?.data?.message || 'Failed to update product';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <section className="flex min-h-screen bg-gray-50">
                <SellerSidebar />
                <div className="w-full relative">
                    <SellerHeader />
                    <SellerContainer>
                        <div className="pt-16 md:py-7 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                        </div>
                    </SellerContainer>
                </div>
            </section>
        );
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <section className="flex min-h-screen bg-gray-50">
                <SellerSidebar />
                <UploadProgressModal isOpen={isSubmitting && hasNewUploads} fileCount={totalNewFiles} />

                <div className="w-full relative">
                    <SellerHeader />
                    <SellerContainer>
                        <div className="pt-16 md:py-7">
                            <div className="flex items-center gap-3 mb-5">
                                <button onClick={() => navigate('/seller/products/all')}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <ArrowLeft size={20} />
                                </button>
                                <h1 className="text-3xl md:text-4xl font-bold">Edit Product (Seller)</h1>
                            </div>

                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    {['Product Info', 'Pricing', 'Review & Submit'].map((label, index) => (
                                        <div key={index} className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step > index + 1 ? 'bg-green-500 text-white' :
                                                step === index + 1 ? 'bg-[#1e2d3b] text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                {step > index + 1 ? <CheckCircle size={20} /> : index + 1}
                                            </div>
                                            <span className="text-sm mt-2 hidden md:block">{label}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="w-full bg-gray-200 h-3 rounded-full">
                                    <div className="bg-[#1e2d3b] h-3 rounded-full transition-all duration-300"
                                        style={{ width: `${(step / 3) * 100}%` }}></div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit(updateProductHandler)}
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">

                                {step === 1 && (
                                    <div>
                                        <h2 className="text-xl font-semibold mb-6 flex items-center">
                                            <FileText size={20} className="mr-2" />Product Information
                                        </h2>

                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-secondary mb-1">Item Name *</label>
                                            <input {...register('title', { required: 'Item name is required' })} type="text"
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                                placeholder="Product name" />
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
                                                    disabled={!watch('parentCategory') || loadingCategories}>
                                                    <option value="">Select a subcategory</option>
                                                    {subCategories.map(sub => (
                                                        <option key={sub._id} value={sub.slug}>{sub.name}</option>
                                                    ))}
                                                </select>
                                                {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>}
                                            </div>
                                        </div>

                                        {watch('category') && (
                                            <div className="mb-6">
                                                <div className="mb-4 pb-2 border-b border-gray-200">
                                                    <h3 className="text-lg font-medium text-gray-800">
                                                        {selectedParent?.name} - {subCategories.find(s => s.slug === watch('category'))?.name || 'Category'} Specifications
                                                    </h3>
                                                </div>
                                                {loadingFields ? (
                                                    <div className="flex justify-center items-center py-12">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                                                    </div>
                                                ) : categoryFields.length === 0 ? (
                                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                                                        <AlertCircle size={40} className="mx-auto text-gray-400 mb-3" />
                                                        <p className="text-gray-500">This category doesn't have any specific fields configured.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-8">
                                                        {Object.entries(categoryFields.reduce((acc, field) => {
                                                            const group = field.group || 'General';
                                                            if (!acc[group]) acc[group] = [];
                                                            acc[group].push(field);
                                                            return acc;
                                                        }, {})).map(([groupName, fields]) => (
                                                            <div key={groupName} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                                                    <h3 className="font-medium text-gray-700">{groupName}</h3>
                                                                </div>
                                                                <div className="p-4">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {fields.sort((a, b) => a.order - b.order).map(field => (
                                                                            <DynamicField key={`${field._id || field.name}-${watch('category')}`}
                                                                                field={field} register={register} errors={errors} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-secondary mb-1">Description *</label>
                                            <RTE name="description" control={control} label="Description:"
                                                defaultValue={getValues('description') || ''}
                                                onBlur={(value) => setValue('description', value, { shouldValidate: true })} />
                                            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1">Location</label>
                                                <div className="relative">
                                                    <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                                    <input {...register('location')} type="text"
                                                        className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                                        placeholder="Location" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1">Video Link</label>
                                                <div className="relative">
                                                    <Youtube size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                                    <input {...register('video', {
                                                        pattern: { value: /^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/, message: 'Invalid YouTube URL' }
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
                                            {allPhotos.length > 0 && (
                                                <PhotoGallery photos={allPhotos} movePhoto={movePhoto} removePhoto={removePhoto} />
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

                                            {existingDocuments.length > 0 && (
                                                <div className="mt-4">
                                                    <p className="text-sm text-secondary mb-2">Existing Documents:</p>
                                                    <div className="space-y-2">
                                                        {existingDocuments.map((doc, index) => (
                                                            <div key={`existing-doc-${index}`} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                                                <span className="text-sm font-medium truncate">{doc.filename || doc.originalName}</span>
                                                                <button type="button" onClick={() => removeDocument(index, true)} className="text-red-500">
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {uploadedDocuments.length > 0 && (
                                                <div className="mt-4">
                                                    <p className="text-sm text-secondary mb-2">New Documents:</p>
                                                    <div className="space-y-2">
                                                        {uploadedDocuments.map((doc, index) => (
                                                            <div key={`new-doc-${index}`} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                                                <span className="text-sm font-medium truncate">{doc.name}</span>
                                                                <button type="button" onClick={() => removeDocument(index, false)} className="text-red-500">
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
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
                                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                                    <h4 className="font-medium mb-3">Item Details</h4>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <p className="text-xs text-secondary">Item Name</p>
                                                            <p className="font-medium">{watch('title') || 'Not provided'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-secondary">Location</p>
                                                            <p className="font-medium">{watch('location') || 'Not specified'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                                        <h4 className="font-medium mb-3">Pricing</h4>
                                                        <div>
                                                            <p className="text-xs text-secondary">Price</p>
                                                            <p className="font-medium text-green-600">${watch('price') || '0.00'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                                        <h4 className="font-medium mb-3">Media & Documents</h4>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between">
                                                                <p className="text-xs text-secondary">Photos</p>
                                                                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                                                                    {allPhotos.length} total ({newPhotos.length} new)
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <p className="text-xs text-secondary">Documents</p>
                                                                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                                                                    {existingDocuments.length + uploadedDocuments.length} total
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
                                        <button type="submit" disabled={isSubmitting}
                                            className="flex items-center px-6 py-2 bg-[#C59D55] text-white hover:bg-[#C59D55]/90 rounded-lg transition-colors disabled:opacity-50">
                                            <Tag size={18} className="mr-2" />
                                            {isSubmitting ? 'Updating Product...' : 'Update Product'}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </SellerContainer>
                </div>
            </section>
        </DndProvider>
    );
};

export default EditProduct;