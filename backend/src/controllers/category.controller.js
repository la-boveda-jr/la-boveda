import Category from "../models/category.model.js";
import {
  deleteFromCloudinary,
  uploadImageToCloudinary,
} from "../utils/cloudinary.js";
import mongoose from "mongoose";

export const createCategory = async (req, res) => {
  try {
    const admin = req.user;
    const {
      name,
      description,
      parentCategory,
      isActive = true,
      order = 0,
      fields = [],
      inheritedFields = true,
    } = req.body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    // Check if parent exists if provided
    if (parentCategory) {
      const parent = await Category.findById(parentCategory);
      if (!parent) {
        return res.status(400).json({
          success: false,
          message: "Parent category not found",
        });
      }
      if (parent.level === 1) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot create subcategory under another subcategory. Maximum 2 levels allowed.",
        });
      }
    }

    // Check if category already exists under the same parent
    const query = {
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    };

    // If parentCategory is provided, check only within that parent
    // If no parentCategory, check only root-level categories (parentCategory: null)
    if (parentCategory) {
      query.parentCategory = parentCategory;
    } else {
      query.parentCategory = null;
    }

    const existingCategory = await Category.findOne(query);

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: `A category with name "${name.trim()}" already exists ${parentCategory ? 'under this parent category' : 'at the root level'}`,
      });
    }

    // Parse fields if they're sent as JSON string
    let parsedFields = [];
    if (fields) {
      try {
        parsedFields = typeof fields === "string" ? JSON.parse(fields) : fields;
      } catch (e) {
        console.error("Fields parsing error:", e);
      }
    }

    // Handle icon upload
    let iconData = null;
    if (req.files && req.files.icon) {
      const iconFile = req.files.icon[0];
      try {
        const result = await uploadImageToCloudinary(
          iconFile.buffer,
          `category-icons/${Date.now()}`,
          "category-icons",
        );
        iconData = {
          url: result.secure_url,
          publicId: result.public_id,
          filename: iconFile.originalname,
        };
      } catch (uploadError) {
        console.error("Icon upload error:", uploadError);
        return res.status(400).json({
          success: false,
          message: "Failed to upload icon",
        });
      }
    }

    // Handle image upload
    let imageData = null;
    if (req.files && req.files.image) {
      const imageFile = req.files.image[0];
      try {
        const result = await uploadImageToCloudinary(
          imageFile.buffer,
          `category-images/${Date.now()}`,
          "category-images",
        );
        imageData = {
          url: result.secure_url,
          publicId: result.public_id,
          filename: imageFile.originalname,
        };
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(400).json({
          success: false,
          message: "Failed to upload category image",
        });
      }
    }

    // Create category
    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || "",
      parentCategory: parentCategory || null,
      icon: iconData,
      image: imageData,
      fields: parsedFields,
      inheritedFields,
      isActive: isActive === "true" || isActive === true,
      order: parseInt(order) || 0,
      createdBy: admin._id,
    });

    // Populate parent category for response
    await category.populate("parentCategory", "name slug");

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create category",
    });
  }
};

/**
 * @desc    Update category (including fields)
 * @route   PUT /api/v1/admin/categories/:id
 * @access  Private/Admin
 */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      parentCategory,
      isActive,
      order,
      fields,
      inheritedFields,
      removeIcon = false,
      removeImage = false,
    } = req.body;

    // Find category
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Validate parent category if changing
    if (parentCategory !== undefined) {
      if (parentCategory) {
        if (parentCategory === id) {
          return res.status(400).json({
            success: false,
            message: "Category cannot be its own parent",
          });
        }

        const parent = await Category.findById(parentCategory);
        if (!parent) {
          return res.status(400).json({
            success: false,
            message: "Parent category not found",
          });
        }

        if (parent.level === 1) {
          return res.status(400).json({
            success: false,
            message: "Cannot create subcategory under another subcategory",
          });
        }
      }
      category.parentCategory = parentCategory || null;
    }

    // Handle icon removal if requested
    if (removeIcon === "true" || removeIcon === true) {
      if (category.icon && category.icon.publicId) {
        await deleteFromCloudinary(category.icon.publicId, "image");
      }
      category.icon = null;
    }

    // Handle image removal if requested
    if (removeImage === "true" || removeImage === true) {
      if (category.image && category.image.publicId) {
        await deleteFromCloudinary(category.image.publicId, "image");
      }
      category.image = null;
    }

    // Handle icon upload/replacement
    if (req.files && req.files.icon) {
      const iconFile = req.files.icon[0];
      try {
        if (category.icon && category.icon.publicId) {
          await deleteFromCloudinary(category.icon.publicId, "image");
        }

        const result = await uploadImageToCloudinary(
          iconFile.buffer,
          `category-icons/${Date.now()}`,
          "category-icons",
        );
        category.icon = {
          url: result.secure_url,
          publicId: result.public_id,
          filename: iconFile.originalname,
        };
      } catch (uploadError) {
        console.error("Icon upload error:", uploadError);
        return res.status(400).json({
          success: false,
          message: "Failed to upload icon",
        });
      }
    }

    // Handle image upload/replacement
    if (req.files && req.files.image) {
      const imageFile = req.files.image[0];
      try {
        if (category.image && category.image.publicId) {
          await deleteFromCloudinary(category.image.publicId, "image");
        }

        const result = await uploadImageToCloudinary(
          imageFile.buffer,
          `category-images/${Date.now()}`,
          "category-images",
        );
        category.image = {
          url: result.secure_url,
          publicId: result.public_id,
          filename: imageFile.originalname,
        };
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(400).json({
          success: false,
          message: "Failed to upload category image",
        });
      }
    }

    // Update other fields
    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description.trim();
    if (isActive !== undefined)
      category.isActive = isActive === "true" || isActive === true;
    if (order !== undefined) category.order = parseInt(order) || 0;
    if (inheritedFields !== undefined)
      category.inheritedFields =
        inheritedFields === "true" || inheritedFields === true;

    // Update fields if provided
    if (fields) {
      try {
        category.fields =
          typeof fields === "string" ? JSON.parse(fields) : fields;
      } catch (e) {
        console.error("Fields parsing error:", e);
      }
    }

    await category.save();
    await category.populate("parentCategory", "name slug");

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update category",
    });
  }
};

/**
 * @desc    Get category fields with inheritance
 * @route   GET /api/v1/admin/categories/:id/fields
 * @access  Private/Admin
 */
export const getCategoryFields = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id).populate(
      "parentCategory",
      "name slug fields",
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const effectiveFields = await category.getEffectiveFields();

    res.status(200).json({
      success: true,
      data: {
        category: {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          inheritedFields: category.inheritedFields,
        },
        fields: effectiveFields,
        parentFields: category.parentCategory
          ? category.parentCategory.fields
          : [],
      },
    });
  } catch (error) {
    console.error("Get category fields error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category fields",
    });
  }
};

/**
 * @desc    Add field to category
 * @route   POST /api/v1/admin/categories/:id/fields
 * @access  Private/Admin
 */
export const addCategoryField = async (req, res) => {
  try {
    const { id } = req.params;
    const fieldData = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Validate field name uniqueness
    const fieldExists = category.fields.some((f) => f.name === fieldData.name);
    if (fieldExists) {
      return res.status(400).json({
        success: false,
        message: `Field with name '${fieldData.name}' already exists in this category`,
      });
    }

    // Generate an _id for the new field
    const newField = {
      _id: new mongoose.Types.ObjectId(), // ADD THIS
      ...fieldData,
    };

    category.fields.push(newField);
    await category.save();

    res.status(201).json({
      success: true,
      message: "Field added successfully",
      data: {
        field: category.fields[category.fields.length - 1],
      },
    });
  } catch (error) {
    console.error("Add category field error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add field",
    });
  }
};

/**
 * @desc    Update field in category
 * @route   PUT /api/v1/admin/categories/:id/fields/:fieldId
 * @access  Private/Admin
 */
/**
 * @desc    Update field in category
 * @route   PUT /api/v1/admin/categories/:id/fields/:fieldId
 * @access  Private/Admin
 */
export const updateCategoryField = async (req, res) => {
  try {
    const { id, fieldId } = req.params;
    const fieldData = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // First try to find by _id (this is the reliable method)
    let fieldIndex = category.fields.findIndex(
      (f) => f._id && f._id.toString() === fieldId.toString(),
    );

    // If not found by _id, try to find by name using the ORIGINAL name from the request
    // But we need to pass the original name separately
    if (fieldIndex === -1 && fieldData.originalName) {
      fieldIndex = category.fields.findIndex((f) => f.name === fieldData.originalName);
    }

    // If still not found and we have the fieldId, try that as a name (for backward compatibility)
    if (fieldIndex === -1 && fieldId) {
      fieldIndex = category.fields.findIndex((f) => f.name === fieldId);
    }

    if (fieldIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Field not found",
      });
    }

    // Preserve the original _id
    const existingField = category.fields[fieldIndex];
    
    // Update field, but keep the original _id
    category.fields[fieldIndex] = {
      ...fieldData,
      _id: existingField._id, // Preserve the ID
    };

    await category.save();

    res.status(200).json({
      success: true,
      message: "Field updated successfully",
      data: {
        field: category.fields[fieldIndex],
      },
    });
  } catch (error) {
    console.error("Update category field error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update field",
    });
  }
};

/**
 * @desc    Delete field from category
 * @route   DELETE /api/v1/admin/categories/:id/fields/:fieldId
 * @access  Private/Admin
 */
export const deleteCategoryField = async (req, res) => {
  try {
    const { id, fieldId } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.fields = category.fields.filter(
      // (f) => f._id.toString() !== fieldId,
      (f) => f.name !== fieldId,
    );
    await category.save();

    res.status(200).json({
      success: true,
      message: "Field deleted successfully",
    });
  } catch (error) {
    console.error("Delete category field error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete field",
    });
  }
};

/**
 * @desc    Get categories by level
 * @route   GET /api/v1/admin/categories/level/:level
 * @access  Private/Admin
 */
export const getCategoriesByLevel = async (req, res) => {
  try {
    const { level } = req.params;

    const categories = await Category.getByLevel(parseInt(level));

    res.status(200).json({
      success: true,
      data: {
        categories,
      },
    });
  } catch (error) {
    console.error("Get categories by level error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

/**
 * @desc    Get all categories
 * @route   GET /api/v1/admin/categories
 * @access  Private/Admin
 */
export const getAllCategories = async (req, res) => {
  try {
    const {
      search = "",
      isActive,
      page = 1,
      limit = 20,
      sortBy = "order",
      sortOrder = "asc",
    } = req.query;

    // Build filter
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get categories
    const categories = await Category.find(filter)
      .populate("createdBy", "username email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalCategories = await Category.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        categories,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCategories / limit),
          totalCategories,
          hasNextPage: skip + categories.length < totalCategories,
          hasPrevPage: skip > 0,
        },
      },
    });
  } catch (error) {
    console.error("Get all categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

/**
 * @desc    Get category by ID
 * @route   GET /api/v1/admin/categories/:id
 * @access  Private/Admin
 */
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id).populate(
      "createdBy",
      "username email",
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        category,
      },
    });
  } catch (error) {
    console.error("Get category by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    });
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/v1/admin/categories/:id
 * @access  Private/Admin
 */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if category has auctions
    const Auction = (await import("../models/auction.model.js")).default;
    const auctionCount = await Auction.countDocuments({
      category: category.name,
      status: { $ne: "draft" },
    });

    if (auctionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. There are ${auctionCount} active auctions in this category.`,
      });
    }

    // Delete images from Cloudinary
    if (category.icon && category.icon.publicId) {
      await deleteFromCloudinary(category.icon.publicId, "image");
    }
    if (category.image && category.image.publicId) {
      await deleteFromCloudinary(category.image.publicId, "image");
    }

    // Delete category
    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};

/**
 * @desc    Toggle category status (Active/Inactive)
 * @route   PATCH /api/v1/admin/categories/:id/toggle-status
 * @access  Private/Admin
 */
export const toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isActive = !category.isActive;
    await category.save();

    res.status(200).json({
      success: true,
      message: `Category ${category.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        category,
      },
    });
  } catch (error) {
    console.error("Toggle category status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle category status",
    });
  }
};

/**
 * @desc    Get category tree (for dropdowns)
 * @route   GET /api/v1/admin/categories/tree
 * @access  Private/Admin
 */
export const getCategoryTree = async (req, res) => {
  try {
    const tree = await Category.getCategoryTree();

    res.status(200).json({
      success: true,
      data: {
        tree,
      },
    });
  } catch (error) {
    console.error("Get category tree error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category tree",
    });
  }
};

/**
 * @desc    Get active categories for public display
 * @route   GET /api/v1/categories/public/active
 * @access  Public
 */
export const getActiveCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      isActive: true,
      icon: { $exists: true, $ne: null },
    })
      .select("name slug icon.url order")
      .sort({ order: 1, name: 1 })
      .limit(9); // Limit to 9 categories to make room for Explore

    // Format categories exactly like your original
    const formattedCategories = categories.map((category) => ({
      name: category.name,
      icon: category.icon?.url || "",
      type: "img",
      slug: category.slug,
    }));

    // Add Explore as the 10th item
    formattedCategories.push({
      name: "Explore",
      icon: "",
      type: "svg",
    });

    res.status(200).json({
      success: true,
      data: formattedCategories,
    });
  } catch (error) {
    console.error("Get active categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

/**
 * @desc    Get active categories for public display (with images)
 * @route   GET /api/v1/categories/public/with-images
 * @access  Public
 */
export const getCategoriesWithImages = async (req, res) => {
  try {
    const categories = await Category.find({
      isActive: true,
      image: { $exists: true, $ne: null }, // Only categories with images
      "image.url": { $exists: true, $ne: "" }, // Ensure image URL exists
    })
      .select("name slug image order auctionCount description")
      .sort({ order: 1, name: 1 })
      .limit(20); // Limit to 10 categories

    // Format categories for frontend
    const formattedCategories = categories.map((category) => ({
      name: category.name,
      slug: category.slug,
      image: category.image?.url,
      order: category.order,
      auctionCount: category.auctionCount,
      description: category.description
    }));

    res.status(200).json({
      success: true,
      data: formattedCategories,
    });
  } catch (error) {
    console.error("Get categories with images error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

/**
 * @desc    Get parent categories (level 0) - PUBLIC
 * @route   GET /api/v1/categories/public/parents
 * @access  Public
 */
export const getParentCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      level: 0,
      isActive: true,
    })
      .select("name slug icon.url order")
      .sort({ order: 1, name: 1 });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get parent categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch parent categories",
    });
  }
};

/**
 * @desc    Get subcategories by parent slug - PUBLIC
 * @route   GET /api/v1/categories/public/:parentSlug/children
 * @access  Public
 */
export const getSubcategoriesByParentSlug = async (req, res) => {
  try {
    const { parentSlug } = req.params;

    // Find parent category by slug
    const parent = await Category.findOne({
      slug: parentSlug,
      isActive: true,
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent category not found",
      });
    }

    // Find all subcategories
    const subcategories = await Category.find({
      parentCategory: parent._id,
      isActive: true,
      level: 1,
    })
      .select("name slug icon.url order")
      .sort({ order: 1, name: 1 });

    res.status(200).json({
      success: true,
      data: {
        parent: {
          _id: parent._id,
          name: parent.name,
          slug: parent.slug,
        },
        subcategories,
      },
    });
  } catch (error) {
    console.error("Get subcategories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subcategories",
    });
  }
};

/**
 * @desc    Get category fields by slug - PUBLIC
 * @route   GET /api/v1/categories/public/by-slug/:slug/fields
 * @access  Public
 */

export const getCategoryFieldsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      slug,
      isActive: true,
    }).populate("parentCategory");

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Get effective fields
    const effectiveFields = await category.getEffectiveFields();

    // Ensure every field has an _id
    const formattedFields = effectiveFields.map((field) => {
      const fieldObj = field.toObject ? field.toObject() : field;

      // Generate _id if it doesn't exist
      if (!fieldObj._id) {
        fieldObj._id = new mongoose.Types.ObjectId();
      }

      return {
        ...fieldObj,
        _id: fieldObj._id.toString(),
        label: fieldObj.label || fieldObj.name,
        placeholder:
          fieldObj.placeholder ||
          `Enter ${(fieldObj.label || fieldObj.name).toLowerCase()}`,
        source: fieldObj.inherited ? "inherited" : "own",
        sourceCategory:
          fieldObj.inherited && category.parentCategory
            ? {
              name: category.parentCategory.name,
              slug: category.parentCategory.slug,
            }
            : null,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        category: {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          level: category.level,
        },
        fields: formattedFields,
      },
    });
  } catch (error) {
    console.error("Get category fields by slug error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category fields",
    });
  }
};

export const getAllSubcategories = async (req, res) => {
  try {
    const subcategories = await Category.find({
      level: 1,
      isActive: true,
    })
      .populate("parentCategory", "name slug")
      .select("name slug parentCategory")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: subcategories,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch subcategories" });
  }
};

/**
 * @desc    Get parent categories with images for homepage carousel
 * @route   GET /api/v1/categories/public/parents/with-images
 * @access  Public
 */
export const getParentCategoriesWithImages = async (req, res) => {
  try {
    const categories = await Category.find({
      isActive: true,
      level: 0, // Only parent categories
      image: { $exists: true, $ne: null }, // Only categories with images
      'image.url': { $exists: true, $ne: '' }
    })
      .select('name slug image order auctionCount description')
      .sort({ order: 1, name: 1 })
      .limit(20);

    // Format categories for frontend
    const formattedCategories = categories.map(category => ({
      name: category.name,
      slug: category.slug,
      image: category.image?.url,
      order: category.order,
      auctionCount: category.auctionCount,
      description: category?.description
    }));

    res.status(200).json({
      success: true,
      data: formattedCategories
    });
  } catch (error) {
    console.error('Get parent categories with images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};