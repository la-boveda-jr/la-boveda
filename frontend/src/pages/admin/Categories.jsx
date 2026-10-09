import { useState, useEffect, useRef } from "react";
import {
    Plus, Search, Filter, Edit, Trash2, Eye, EyeOff,
    ChevronDown, ChevronRight, FolderTree, Image as ImageIcon,
    Upload, X, Save, Tag, ListOrdered, Percent, FileText,
    Layers, CheckCircle, AlertCircle, Settings, Copy,
    ChevronLeft, GripVertical, PlusCircle, Trash
} from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-hot-toast";
import { AdminContainer, AdminHeader, AdminSidebar } from "../../components";

function Categories() {
    const [categories, setCategories] = useState([]);
    const [filteredCategories, setFilteredCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [iconPreview, setIconPreview] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const [expandedCategories, setExpandedCategories] = useState([]);
    const [parentCategories, setParentCategories] = useState([]);
    const [showFieldManager, setShowFieldManager] = useState(false);
    const [selectedCategoryForFields, setSelectedCategoryForFields] = useState(null);
    const [categoryFields, setCategoryFields] = useState([]);
    const [editingField, setEditingField] = useState(null);
    const [showFieldForm, setShowFieldForm] = useState(false);
    const [loadingFields, setLoadingFields] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        search: "",
        status: "all",
        sortBy: "order",
        sortOrder: "asc",
        level: "all"
    });

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        parentCategory: "",
        isActive: true,
        order: 0,
        inheritedFields: true,
        fields: [],
        removeIcon: false,
        removeImage: false
    });

    // Field form state
    const [fieldFormData, setFieldFormData] = useState({
        name: "",
        label: "",
        fieldType: "text",
        required: false,
        placeholder: "",
        defaultValue: "",
        unit: "",
        group: "General",
        order: 0,
        options: [],
        validation: {
            min: "",
            max: "",
            minLength: "",
            maxLength: "",
            pattern: "",
            message: ""
        }
    });

    // Option management for select fields
    const [fieldOptions, setFieldOptions] = useState([]);
    const [newOption, setNewOption] = useState({ label: "", value: "" });

    // Fetch categories
    const fetchCategories = async () => {
        try {
            setLoading(true);
            const { data } = await axiosInstance.get('/api/v1/categories', {
                params: { limit: 1000 }
            });

            if (data.success) {
                setCategories(data.data.categories);
                setFilteredCategories(data.data.categories);

                // Fetch parent categories for dropdown
                const parentCats = data.data.categories.filter(cat => !cat.parentCategory);
                setParentCategories(parentCats);
            }
        } catch (error) {
            console.error('Fetch categories error:', error);
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    // Fetch category fields
    const fetchCategoryFields = async (categoryId) => {
        try {
            setLoadingFields(true);
            const { data } = await axiosInstance.get(`/api/v1/categories/${categoryId}/fields`);
            if (data.success) {
                setCategoryFields(data.data.fields || []);
            }
        } catch (error) {
            console.error('Fetch category fields error:', error);
            toast.error('Failed to load category fields');
        } finally {
            setLoadingFields(false);
        }
    };

    useEffect(() => {
        if (categories.length === 0) return;

        let filtered = [...categories];

        // Search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(category =>
                category.name.toLowerCase().includes(searchTerm) ||
                (category.description && category.description.toLowerCase().includes(searchTerm))
            );
        }

        // Status filter
        if (filters.status === 'true') {
            filtered = filtered.filter(category => category.isActive === true);
        } else if (filters.status === 'false') {
            filtered = filtered.filter(category => category.isActive === false);
        }

        // Level filter
        if (filters.level !== 'all') {
            filtered = filtered.filter(category => category.level === parseInt(filters.level));
        }

        // Sort
        filtered.sort((a, b) => {
            const aValue = a[filters.sortBy] || 0;
            const bValue = b[filters.sortBy] || 0;

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return filters.sortOrder === 'desc'
                    ? bValue.localeCompare(aValue)
                    : aValue.localeCompare(bValue);
            }

            return filters.sortOrder === 'desc'
                ? bValue - aValue
                : aValue - bValue;
        });

        setFilteredCategories(filtered);
    }, [categories, filters]);

    useEffect(() => {
        fetchCategories();
    }, []);

    // Handle filter changes
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            search: "",
            status: "all",
            sortBy: "order",
            sortOrder: "asc",
            level: "all"
        });
    };

    // Handle file upload for icon
    const handleIconUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload an image file for icon');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setIconPreview(reader.result);
            };
            reader.readAsDataURL(file);

            setFormData(prev => ({ ...prev, iconFile: file }));
        }
    };

    // Handle file upload for image
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload an image file');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);

            setFormData(prev => ({ ...prev, imageFile: file }));
        }
    };

    // Remove icon
    const removeIcon = () => {
        setIconPreview(null);
        setFormData(prev => ({
            ...prev,
            iconFile: null,
            removeIcon: editingCategory?.icon?.url ? true : false
        }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Remove image
    const removeImage = () => {
        setImagePreview(null);
        setFormData(prev => ({
            ...prev,
            imageFile: null,
            removeImage: editingCategory?.image?.url ? true : false
        }));
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
    };

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Category name is required');
            return;
        }

        try {
            setUploading(true);

            const formDataToSend = new FormData();
            formDataToSend.append('name', formData.name.trim());
            formDataToSend.append('description', formData.description);
            formDataToSend.append('parentCategory', formData.parentCategory || '');
            formDataToSend.append('isActive', formData.isActive);
            formDataToSend.append('order', formData.order);
            formDataToSend.append('inheritedFields', formData.inheritedFields);
            formDataToSend.append('removeIcon', formData.removeIcon);
            formDataToSend.append('removeImage', formData.removeImage);

            // Send fields as JSON string
            if (formData.fields.length > 0) {
                formDataToSend.append('fields', JSON.stringify(formData.fields));
            }

            if (formData.iconFile) {
                formDataToSend.append('icon', formData.iconFile);
            }

            if (formData.imageFile) {
                formDataToSend.append('image', formData.imageFile);
            }

            let response;
            if (editingCategory) {
                response = await axiosInstance.put(
                    `/api/v1/categories/${editingCategory._id}`,
                    formDataToSend,
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );
            } else {
                response = await axiosInstance.post(
                    '/api/v1/categories',
                    formDataToSend,
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );
            }

            if (response.data.success) {
                toast.success(editingCategory ? 'Category updated successfully' : 'Category created successfully');
                resetForm();
                fetchCategories();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save category');
        } finally {
            setUploading(false);
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            parentCategory: "",
            isActive: true,
            order: 0,
            inheritedFields: true,
            fields: [],
            removeIcon: false,
            removeImage: false
        });
        setIconPreview(null);
        setImagePreview(null);
        setEditingCategory(null);
        setShowForm(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (imageInputRef.current) imageInputRef.current.value = '';
    };

    // Edit category
    const handleEdit = (category) => {
        setFormData({
            name: category.name,
            description: category.description || "",
            parentCategory: category.parentCategory?._id || category.parentCategory || "",
            isActive: category.isActive,
            order: category.order,
            inheritedFields: category.inheritedFields !== false,
            fields: category.fields || [],
            removeIcon: false,
            removeImage: false
        });

        if (category.icon?.url) setIconPreview(category.icon.url);
        if (category.image?.url) setImagePreview(category.image.url);

        setEditingCategory(category);
        setShowForm(true);
    };

    // Open field manager
    const handleManageFields = async (category) => {
        setSelectedCategoryForFields(category);
        await fetchCategoryFields(category._id);
        setShowFieldManager(true);
    };

    // Add/Edit field
    const handleSaveField = async () => {
        try {
            // Validate field name
            if (!fieldFormData.name.trim()) {
                toast.error('Field name is required');
                return;
            }

            // Generate name from label if not provided
            const fieldName = fieldFormData.name.trim().toLowerCase().replace(/\s+/g, '_');

            const fieldPayload = {
                ...fieldFormData,
                name: fieldName,
                options: fieldFormData.fieldType === 'select' ? fieldOptions : []
            };

            if (editingField) {
                // Update existing field
                const fieldId = editingField._id || editingField.name; // Fallback to name if no _id
                const { data } = await axiosInstance.put(
                    `/api/v1/categories/${selectedCategoryForFields._id}/fields/${fieldId}`,
                    fieldPayload
                );
                if (data.success) {
                    toast.success('Field updated successfully');
                }
            } else {
                // Add new field
                const { data } = await axiosInstance.post(
                    `/api/v1/categories/${selectedCategoryForFields._id}/fields`,
                    fieldPayload
                );
                if (data.success) {
                    toast.success('Field added successfully');
                }
            }

            // Refresh fields
            await fetchCategoryFields(selectedCategoryForFields._id);
            resetFieldForm();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save field');
        }
    };

    // Delete field
    const handleDeleteField = async (fieldId) => {
        if (!confirm('Are you sure you want to delete this field?')) return;

        try {
            const { data } = await axiosInstance.delete(
                `/api/v1/categories/${selectedCategoryForFields._id}/fields/${fieldId}`
            );
            if (data.success) {
                toast.success('Field deleted successfully');
                await fetchCategoryFields(selectedCategoryForFields._id);
            }
        } catch (error) {
            toast.error('Failed to delete field');
        }
    };

    // Reset field form
    const resetFieldForm = () => {
        setFieldFormData({
            name: "",
            label: "",
            fieldType: "text",
            required: false,
            placeholder: "",
            defaultValue: "",
            unit: "",
            group: "General",
            order: 0,
            options: [],
            validation: {
                min: "",
                max: "",
                minLength: "",
                maxLength: "",
                pattern: "",
                message: ""
            }
        });
        setFieldOptions([]);
        setEditingField(null);
        setShowFieldForm(false);
    };

    // Edit field
    const handleEditField = (field) => {
        setFieldFormData({
            name: field.name || "",
            label: field.label || "",
            fieldType: field.fieldType || "text",
            required: field.required || false,
            placeholder: field.placeholder || "",
            defaultValue: field.defaultValue || "",
            unit: field.unit || "",
            group: field.group || "General",
            order: field.order || 0,
            validation: field.validation || {
                min: "",
                max: "",
                minLength: "",
                maxLength: "",
                pattern: "",
                message: ""
            }
        });
        setFieldOptions(field.options || []);
        setEditingField(field);
        setShowFieldForm(true);
    };

    // Add option to select field
    const handleAddOption = () => {
        if (newOption.label && newOption.value) {
            setFieldOptions([...fieldOptions, { ...newOption }]);
            setNewOption({ label: "", value: "" });
        }
    };

    // Remove option from select field
    const handleRemoveOption = (index) => {
        setFieldOptions(fieldOptions.filter((_, i) => i !== index));
    };

    // Delete category
    const handleDelete = async () => {
        if (!categoryToDelete) return;

        try {
            const { data } = await axiosInstance.delete(`/api/v1/categories/${categoryToDelete._id}`);

            if (data.success) {
                toast.success('Category deleted successfully');
                setShowDeleteModal(false);
                setCategoryToDelete(null);
                fetchCategories();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete category');
        }
    };

    // Toggle category status
    const toggleStatus = async (category) => {
        try {
            const { data } = await axiosInstance.patch(
                `/api/v1/categories/${category._id}/toggle-status`
            );

            if (data.success) {
                toast.success(`Category ${data.data.category.isActive ? 'activated' : 'deactivated'}`);
                fetchCategories();
            }
        } catch (error) {
            toast.error('Failed to update category status');
        }
    };

    // Toggle category expansion
    const toggleExpand = (categoryId) => {
        setExpandedCategories(prev =>
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    // Get child categories
    const getChildCategories = (parentId) => {
        return categories.filter(cat => cat.parentCategory?._id === parentId || cat.parentCategory === parentId);
    };

    if (loading) {
        return (
            <section className="flex min-h-screen bg-gray-50">
                <AdminSidebar />
                <div className="w-full relative">
                    <AdminHeader />
                    <AdminContainer>
                        <div className="flex justify-center items-center min-h-96">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                        </div>
                    </AdminContainer>
                </div>
            </section>
        );
    }

    return (
        <section className="flex min-h-screen bg-gray-50">
            <AdminSidebar />
            <div className="w-full relative">
                <AdminHeader />
                <AdminContainer>
                    <div className="max-w-full pt-16 pb-7 md:pt-0">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold my-5 text-gray-800">
                                    Categories Management
                                </h2>
                                <p className="text-gray-600 mb-4">
                                    Create parent categories and subcategories with custom fields
                                </p>
                            </div>
                            <button
                                onClick={() => setShowForm(true)}
                                className="mt-4 md:mt-0 flex items-center gap-2 bg-primary text-white hover:bg-primary/90 px-4 py-3 rounded-lg transition-colors"
                            >
                                <Plus size={20} />
                                Add New Category
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {/* Search */}
                            <div className="lg:col-span-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search categories..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Level Filter */}
                            <div>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    value={filters.level}
                                    onChange={(e) => handleFilterChange('level', e.target.value)}
                                >
                                    <option value="all">All Levels</option>
                                    <option value="0">Parent Categories</option>
                                    <option value="1">Subcategories</option>
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>

                            {/* Sort By */}
                            <div>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    value={filters.sortBy}
                                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                                >
                                    <option value="order">Sort by Order</option>
                                    <option value="name">Sort by Name</option>
                                    <option value="level">Sort by Level</option>
                                    <option value="createdAt">Sort by Date</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-4">
                            <div className="text-sm text-gray-500">
                                Showing {filteredCategories.length} categories
                            </div>
                            <button
                                onClick={clearFilters}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Clear filters
                            </button>
                        </div>
                    </div>

                    {/* Categories List - Tree View */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                                            <FolderTree size={16} />
                                        </th>
                                        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Icon
                                        </th>
                                        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Image
                                        </th>
                                        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Name / Slug
                                        </th>
                                        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Level
                                        </th>
                                        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Fields
                                        </th>
                                        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredCategories
                                        .filter(cat => !cat.parentCategory)
                                        .map((category) => (
                                            <CategoryRow
                                                key={category._id}
                                                category={category}
                                                categories={categories}
                                                expandedCategories={expandedCategories}
                                                toggleExpand={toggleExpand}
                                                handleEdit={handleEdit}
                                                handleManageFields={handleManageFields}
                                                toggleStatus={toggleStatus}
                                                setCategoryToDelete={setCategoryToDelete}
                                                setShowDeleteModal={setShowDeleteModal}
                                                getChildCategories={getChildCategories}
                                            />
                                        ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredCategories.length === 0 && (
                            <div className="text-center py-12">
                                <Tag size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">No categories found</h3>
                                <p className="text-gray-500 mb-6">
                                    {filters.search || filters.status !== "all" || filters.level !== "all"
                                        ? "No categories match your current filters"
                                        : "Get started by creating your first category"}
                                </p>
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="inline-flex items-center gap-2 bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors"
                                >
                                    <Plus size={18} />
                                    Create Category
                                </button>
                            </div>
                        )}
                    </div>
                </AdminContainer>
            </div>

            {/* Category Form Modal */}
            {showForm && (
                <CategoryFormModal
                    formData={formData}
                    setFormData={setFormData}
                    editingCategory={editingCategory}
                    parentCategories={parentCategories}
                    iconPreview={iconPreview}
                    imagePreview={imagePreview}
                    fileInputRef={fileInputRef}
                    imageInputRef={imageInputRef}
                    handleIconUpload={handleIconUpload}
                    handleImageUpload={handleImageUpload}
                    removeIcon={removeIcon}
                    removeImage={removeImage}
                    handleSubmit={handleSubmit}
                    resetForm={resetForm}
                    uploading={uploading}
                />
            )}

            {/* Field Manager Modal */}
            {showFieldManager && selectedCategoryForFields && (
                <FieldManagerModal
                    category={selectedCategoryForFields}
                    fields={categoryFields}
                    loading={loadingFields}
                    onClose={() => {
                        setShowFieldManager(false);
                        setSelectedCategoryForFields(null);
                        setCategoryFields([]);
                    }}
                    onAddField={() => {
                        resetFieldForm();
                        setShowFieldForm(true);
                    }}
                    onEditField={handleEditField}
                    onDeleteField={handleDeleteField}
                    showFieldForm={showFieldForm}
                    setShowFieldForm={setShowFieldForm}
                    fieldFormData={fieldFormData}
                    setFieldFormData={setFieldFormData}
                    fieldOptions={fieldOptions}
                    setFieldOptions={setFieldOptions}
                    newOption={newOption}
                    setNewOption={setNewOption}
                    handleAddOption={handleAddOption}
                    handleRemoveOption={handleRemoveOption}
                    handleSaveField={handleSaveField}
                    editingField={editingField}
                    resetFieldForm={resetFieldForm}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && categoryToDelete && (
                <DeleteConfirmationModal
                    category={categoryToDelete}
                    onConfirm={handleDelete}
                    onCancel={() => {
                        setShowDeleteModal(false);
                        setCategoryToDelete(null);
                    }}
                />
            )}
        </section>
    );
}

// Category Row Component with Subcategories
const CategoryRow = ({
    category,
    categories,
    expandedCategories,
    toggleExpand,
    handleEdit,
    handleManageFields,
    toggleStatus,
    setCategoryToDelete,
    setShowDeleteModal,
    getChildCategories,
    level = 0
}) => {
    const children = getChildCategories(category._id);
    const isExpanded = expandedCategories.includes(category._id);
    const hasChildren = children.length > 0;

    return (
        <>
            <tr className="hover:bg-gray-50">
                <td className="py-4 px-6">
                    <button
                        onClick={() => toggleExpand(category._id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        disabled={!hasChildren}
                    >
                        {hasChildren ? (
                            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                        ) : (
                            <div className="w-4" />
                        )}
                    </button>
                </td>
                <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                        {category.icon?.url ? (
                            <img
                                src={category.icon.url}
                                alt={category.name}
                                className="h-10 w-14 rounded-lg object-cover border border-gray-200"
                            />
                        ) : (
                            <div className="h-10 w-14 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <Tag className="h-5 w-5 text-gray-400" />
                            </div>
                        )}
                    </div>
                </td>
                <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                        {category.image?.url ? (
                            <img
                                src={category.image.url}
                                alt={category.name}
                                className="h-10 w-14 rounded-lg object-cover border border-gray-200"
                            />
                        ) : (
                            <div className="h-10 w-14 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-gray-400" />
                            </div>
                        )}
                    </div>
                </td>
                <td className="py-4 px-6">
                    <div>
                        <div className="font-medium text-gray-900">
                            {category.name}
                        </div>
                        <div className="text-xs text-gray-500">
                            slug: {category.slug}
                        </div>
                    </div>
                </td>
                <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${category.level === 0
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                        {category.level === 0 ? 'Parent' : 'Subcategory'}
                    </span>
                </td>
                <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                            {category.fields?.length || 0} fields
                        </span>
                        {category.inheritedFields && category.parentCategory && (
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                                Inherits
                            </span>
                        )}
                    </div>
                </td>
                <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${category.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                        {category.isActive ? (
                            <>
                                <CheckCircle size={12} />
                                Active
                            </>
                        ) : (
                            <>
                                <EyeOff size={12} />
                                Inactive
                            </>
                        )}
                    </span>
                </td>
                <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleManageFields(category)}
                            className="p-2 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                            title="Manage Fields"
                        >
                            <Settings size={16} />
                        </button>
                        <button
                            onClick={() => handleEdit(category)}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Edit Category"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => toggleStatus(category)}
                            className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                            title={category.isActive ? 'Deactivate' : 'Activate'}
                        >
                            {category.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                            onClick={() => {
                                setCategoryToDelete(category);
                                setShowDeleteModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete Category"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </td>
            </tr>
            {isExpanded && hasChildren && (
                <>
                    {children.map(child => (
                        <CategoryRow
                            key={child._id}
                            category={child}
                            categories={categories}
                            expandedCategories={expandedCategories}
                            toggleExpand={toggleExpand}
                            handleEdit={handleEdit}
                            handleManageFields={handleManageFields}
                            toggleStatus={toggleStatus}
                            setCategoryToDelete={setCategoryToDelete}
                            setShowDeleteModal={setShowDeleteModal}
                            getChildCategories={getChildCategories}
                            level={level + 1}
                        />
                    ))}
                </>
            )}
        </>
    );
};

// Category Form Modal Component
const CategoryFormModal = ({
    formData,
    setFormData,
    editingCategory,
    parentCategories,
    iconPreview,
    imagePreview,
    fileInputRef,
    imageInputRef,
    handleIconUpload,
    handleImageUpload,
    removeIcon,
    removeImage,
    handleSubmit,
    resetForm,
    uploading
}) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl my-8">
            <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-gray-900">
                        {editingCategory ? 'Edit Category' : 'Create New Category'}
                    </h3>
                    <button
                        onClick={resetForm}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h4 className="font-medium text-gray-700 flex items-center gap-2">
                                <Tag size={18} />
                                Basic Information
                            </h4>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="e.g., sofa, table, chair..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="Brief description of this category..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Parent Category (Optional)
                                </label>
                                <select
                                    value={formData.parentCategory}
                                    onChange={(e) => setFormData(prev => ({ ...prev, parentCategory: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                >
                                    <option value="">-- None (Parent Category) --</option>
                                    {parentCategories
                                        .filter(cat => !editingCategory || cat._id !== editingCategory._id)
                                        .map(cat => (
                                            <option key={cat._id} value={cat._id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Select a parent to create a subcategory (max 2 levels)
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Display Order
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.order}
                                        onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                        className="h-4 w-4 text-orange-500 rounded focus:ring-orange-500"
                                    />
                                    <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                                        Active Category
                                    </label>
                                </div>

                                {formData.parentCategory && (
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="inheritedFields"
                                            checked={formData.inheritedFields}
                                            onChange={(e) => setFormData(prev => ({ ...prev, inheritedFields: e.target.checked }))}
                                            className="h-4 w-4 text-orange-500 rounded focus:ring-orange-500"
                                        />
                                        <label htmlFor="inheritedFields" className="ml-2 text-sm text-gray-700">
                                            Inherit fields from parent
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Icon Upload */}
                        <div className="space-y-4">
                            <h4 className="font-medium text-gray-700 flex items-center gap-2">
                                <ImageIcon size={18} />
                                Category Icon
                            </h4>

                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleIconUpload}
                                    accept="image/*"
                                    className="hidden"
                                    id="icon-upload"
                                />
                                <label htmlFor="icon-upload" className="cursor-pointer">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        {iconPreview || (editingCategory?.icon?.url && !formData.removeIcon) ? (
                                            <>
                                                <img
                                                    src={iconPreview || editingCategory?.icon?.url}
                                                    alt="Icon preview"
                                                    className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                                                />
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        type="button"
                                                        onClick={removeIcon}
                                                        className="text-sm text-red-600 hover:text-red-800"
                                                    >
                                                        Remove
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, removeIcon: true }));
                                                            setIconPreview(null);
                                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                                        }}
                                                        className="text-sm text-blue-600 hover:text-blue-800"
                                                    >
                                                        Upload New
                                                    </button>
                                                </div>
                                                {formData.removeIcon && (
                                                    <p className="text-xs text-red-600 mt-1">
                                                        Icon will be removed on save
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-8 w-8 text-gray-400" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">
                                                        Click to upload icon
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Recommended: 100×100px PNG
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Image Upload */}
                        <div className="space-y-4">
                            <h4 className="font-medium text-gray-700 flex items-center gap-2">
                                <ImageIcon size={18} />
                                Category Image
                            </h4>

                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
                                <input
                                    type="file"
                                    ref={imageInputRef}
                                    onChange={handleImageUpload}
                                    accept="image/*"
                                    className="hidden"
                                    id="image-upload"
                                />
                                <label htmlFor="image-upload" className="cursor-pointer">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        {imagePreview || (editingCategory?.image?.url && !formData.removeImage) ? (
                                            <>
                                                <img
                                                    src={imagePreview || editingCategory?.image?.url}
                                                    alt="Image preview"
                                                    className="h-32 w-full rounded-lg object-cover border border-gray-200"
                                                />
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        type="button"
                                                        onClick={removeImage}
                                                        className="text-sm text-red-600 hover:text-red-800"
                                                    >
                                                        Remove
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, removeImage: true }));
                                                            setImagePreview(null);
                                                            if (imageInputRef.current) imageInputRef.current.value = '';
                                                        }}
                                                        className="text-sm text-blue-600 hover:text-blue-800"
                                                    >
                                                        Upload New
                                                    </button>
                                                </div>
                                                {formData.removeImage && (
                                                    <p className="text-xs text-red-600 mt-1">
                                                        Image will be removed on save
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-8 w-8 text-gray-400" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">
                                                        Click to upload image
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Recommended: 800×400px JPG/PNG
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={resetForm}
                        disabled={uploading}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={uploading}
                        className="flex-1 px-4 py-3 bg-bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                        ) : (
                            <>
                                <Save size={18} />
                                {editingCategory ? 'Update Category' : 'Create Category'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    </div>
);

// Field Manager Modal Component
const FieldManagerModal = ({
    category,
    fields,
    loading,
    onClose,
    onAddField,
    onEditField,
    onDeleteField,
    showFieldForm,
    setShowFieldForm,
    fieldFormData,
    setFieldFormData,
    fieldOptions,
    setFieldOptions,
    newOption,
    setNewOption,
    handleAddOption,
    handleRemoveOption,
    handleSaveField,
    editingField,
    resetFieldForm
}) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl my-8">
            <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Settings size={20} />
                            Manage Fields - {category.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {category.level === 0 ? 'Parent Category' : 'Subcategory'}
                            {category.parentCategory && (
                                <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded-full">
                                    Inherits fields: {category.inheritedFields ? 'Yes' : 'No'}
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
            </div>

            <div className="p-6">
                {!showFieldForm ? (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="font-medium text-gray-700">Category Fields</h4>
                            <button
                                onClick={onAddField}
                                className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors"
                            >
                                <PlusCircle size={18} />
                                Add Field
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                            </div>
                        ) : fields.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">No fields defined</h3>
                                <p className="text-gray-500 mb-6">
                                    Add custom fields that will appear in the auction creation form
                                </p>
                                <button
                                    onClick={onAddField}
                                    className="inline-flex items-center gap-2 bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors"
                                >
                                    <Plus size={18} />
                                    Add Your First Field
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Group fields by group name */}
                                {Object.entries(
                                    fields.reduce((acc, field) => {
                                        const group = field.group || 'General';
                                        if (!acc[group]) acc[group] = [];
                                        acc[group].push(field);
                                        return acc;
                                    }, {})
                                ).map(([groupName, groupFields]) => (
                                    <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                            <h5 className="font-medium text-gray-700">{groupName}</h5>
                                        </div>
                                        <div className="divide-y divide-gray-200">
                                            {groupFields
                                                .sort((a, b) => a.order - b.order)
                                                .map((field, index) => (
                                                    <div key={field._id || index} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3">
                                                                <GripVertical size={16} className="text-gray-400 cursor-move" />
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-gray-900">
                                                                            {field.label || field.name}
                                                                        </span>
                                                                        {field.required && (
                                                                            <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                                                                Required
                                                                            </span>
                                                                        )}
                                                                        {field.inherited && (
                                                                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                                                                Inherited
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        <span className="mr-3">Name: {field.name}</span>
                                                                        <span className="mr-3">Type: {field.fieldType}</span>
                                                                        {field.unit && <span className="mr-3">Unit: {field.unit}</span>}
                                                                        {field.placeholder && <span>Placeholder: {field.placeholder}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => onEditField(field)}
                                                                className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                                                disabled={field.inherited}
                                                                title={field.inherited ? 'Inherited fields cannot be edited here' : 'Edit field'}
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => onDeleteField(field.name)}
                                                                className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                                                disabled={field.inherited}
                                                                title={field.inherited ? 'Inherited fields cannot be deleted here' : 'Delete field'}
                                                            >
                                                                <Trash size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <FieldForm
                        fieldFormData={fieldFormData}
                        setFieldFormData={setFieldFormData}
                        fieldOptions={fieldOptions}
                        setFieldOptions={setFieldOptions}
                        newOption={newOption}
                        setNewOption={setNewOption}
                        handleAddOption={handleAddOption}
                        handleRemoveOption={handleRemoveOption}
                        handleSaveField={handleSaveField}
                        editingField={editingField}
                        onCancel={() => {
                            resetFieldForm();
                            setShowFieldForm(false);
                        }}
                    />
                )}
            </div>
        </div>
    </div>
);

// Field Form Component
const FieldForm = ({
    fieldFormData,
    setFieldFormData,
    fieldOptions,
    setFieldOptions,
    newOption,
    setNewOption,
    handleAddOption,
    handleRemoveOption,
    handleSaveField,
    editingField,
    onCancel
}) => (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-700">
                {editingField ? 'Edit Field' : 'Add New Field'}
            </h4>
            <button
                onClick={onCancel}
                className="text-sm text-gray-500 hover:text-gray-700"
            >
                ← Back to fields
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Basic Info */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Field Label *
                    </label>
                    <input
                        type="text"
                        value={fieldFormData.label}
                        onChange={(e) => {
                            const label = e.target.value;
                            setFieldFormData(prev => ({
                                ...prev,
                                label,
                                name: label.toLowerCase().replace(/\s+/g, '_')
                            }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., Brand, Color, Material..."
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Field name: {fieldFormData.name || 'auto_generated'}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Field Type
                    </label>
                    <select
                        value={fieldFormData.fieldType}
                        onChange={(e) => setFieldFormData(prev => ({ ...prev, fieldType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="select">Select Dropdown</option>
                        <option value="textarea">Textarea</option>
                        <option value="date">Date</option>
                        <option value="boolean">Yes/No</option>
                        <option value="file">File Upload</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Group / Section
                    </label>
                    <input
                        type="text"
                        value={fieldFormData.group}
                        onChange={(e) => setFieldFormData(prev => ({ ...prev, group: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., General, Specs..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Placeholder
                        </label>
                        <input
                            type="text"
                            value={fieldFormData.placeholder}
                            onChange={(e) => setFieldFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Unit (e.g., kg, HP)
                        </label>
                        <input
                            type="text"
                            value={fieldFormData.unit}
                            onChange={(e) => setFieldFormData(prev => ({ ...prev, unit: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="field-required"
                            checked={fieldFormData.required}
                            onChange={(e) => setFieldFormData(prev => ({ ...prev, required: e.target.checked }))}
                            className="h-4 w-4 text-orange-500 rounded focus:ring-orange-500"
                        />
                        <label htmlFor="field-required" className="ml-2 text-sm text-gray-700">
                            Required field
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Display Order
                        </label>
                        <input
                            type="number"
                            value={fieldFormData.order}
                            onChange={(e) => setFieldFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-lg"
                            min="0"
                        />
                    </div>
                </div>
            </div>

            {/* Right Column - Validation & Options */}
            <div className="space-y-4">
                {fieldFormData.fieldType === 'select' && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700">
                            Dropdown Options
                        </label>

                        {/* Options List */}
                        <div className="space-y-2">
                            {fieldOptions.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <span className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm">
                                        {option.label} ({option.value})
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveOption(index)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add New Option */}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newOption.label}
                                onChange={(e) => setNewOption(prev => ({ ...prev, label: e.target.value }))}
                                placeholder="Label (e.g., Yes)"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                                type="text"
                                value={newOption.value}
                                onChange={(e) => setNewOption(prev => ({ ...prev, value: e.target.value }))}
                                placeholder="Value (e.g., yes)"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <button
                                type="button"
                                onClick={handleAddOption}
                                className="px-3 py-2 bg-primary text-white hover:bg-primary/90 rounded-lg"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Validation Rules */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700">
                        Validation Rules
                    </label>

                    {fieldFormData.fieldType === 'number' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                        Minimum Value
                                    </label>
                                    <input
                                        type="number"
                                        value={fieldFormData.validation.min}
                                        onChange={(e) => setFieldFormData(prev => ({
                                            ...prev,
                                            validation: { ...prev.validation, min: e.target.value }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                        Maximum Value
                                    </label>
                                    <input
                                        type="number"
                                        value={fieldFormData.validation.max}
                                        onChange={(e) => setFieldFormData(prev => ({
                                            ...prev,
                                            validation: { ...prev.validation, max: e.target.value }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {fieldFormData.fieldType === 'text' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                        Min Length
                                    </label>
                                    <input
                                        type="number"
                                        value={fieldFormData.validation.minLength}
                                        onChange={(e) => setFieldFormData(prev => ({
                                            ...prev,
                                            validation: { ...prev.validation, minLength: e.target.value }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                        Max Length
                                    </label>
                                    <input
                                        type="number"
                                        value={fieldFormData.validation.maxLength}
                                        onChange={(e) => setFieldFormData(prev => ({
                                            ...prev,
                                            validation: { ...prev.validation, maxLength: e.target.value }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    Pattern (Regex)
                                </label>
                                <input
                                    type="text"
                                    value={fieldFormData.validation.pattern}
                                    onChange={(e) => setFieldFormData(prev => ({
                                        ...prev,
                                        validation: { ...prev.validation, pattern: e.target.value }
                                    }))}
                                    placeholder="e.g., ^[A-Z0-9]+$"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-xs text-gray-500 mb-1">
                            Error Message
                        </label>
                        <input
                            type="text"
                            value={fieldFormData.validation.message}
                            onChange={(e) => setFieldFormData(prev => ({
                                ...prev,
                                validation: { ...prev.validation, message: e.target.value }
                            }))}
                            placeholder="Custom error message"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={handleSaveField}
                className="flex-1 px-4 py-3 bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
                <Save size={18} />
                {editingField ? 'Update Field' : 'Add Field'}
            </button>
        </div>
    </div>
);

// Delete Confirmation Modal
const DeleteConfirmationModal = ({ category, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Delete Category</h3>
            </div>

            <div className="mb-6">
                <p className="text-gray-600 mb-2">
                    Are you sure you want to delete the category <strong>"{category.name}"</strong>?
                </p>
                {category.level === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                        <p className="text-sm text-yellow-700">
                            <strong>Note:</strong> This is a parent category. Deleting it will affect all subcategories.
                        </p>
                    </div>
                )}
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                    <p className="text-sm text-red-700">
                        <strong>Warning:</strong> This action cannot be undone. All category images and icons will be permanently deleted.
                    </p>
                </div>

                {category.auctionCount > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                        <p className="text-sm text-yellow-700">
                            <strong>Note:</strong> This category has {category.auctionCount} auctions. Deleting the category may affect those auctions.
                        </p>
                    </div>
                )}
            </div>

            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <Trash2 size={16} />
                    Delete Category
                </button>
            </div>
        </div>
    </div>
);

export default Categories;