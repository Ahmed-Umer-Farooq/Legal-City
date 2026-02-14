const db = require('../db');
const path = require('path');
const fs = require('fs');

// Get all categories
const getCategories = async (req, res) => {
  try {
    // Check if table exists first
    const tableExists = await db.schema.hasTable('form_categories');
    if (!tableExists) {
      console.log('⚠️ form_categories table does not exist, returning default categories');
      return res.json([
        { id: 1, name: 'Contracts', display_order: 1, is_active: true },
        { id: 2, name: 'Legal Documents', display_order: 2, is_active: true },
        { id: 3, name: 'Court Forms', display_order: 3, is_active: true },
        { id: 4, name: 'Business Forms', display_order: 4, is_active: true },
        { id: 5, name: 'Personal Legal', display_order: 5, is_active: true }
      ]);
    }

    const categories = await db('form_categories')
      .where('is_active', true)
      .orderBy('display_order', 'asc');
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    // Return default categories instead of error
    res.json([
      { id: 1, name: 'Contracts', display_order: 1, is_active: true },
      { id: 2, name: 'Legal Documents', display_order: 2, is_active: true },
      { id: 3, name: 'Court Forms', display_order: 3, is_active: true },
      { id: 4, name: 'Business Forms', display_order: 4, is_active: true },
      { id: 5, name: 'Personal Legal', display_order: 5, is_active: true }
    ]);
  }
};

// Get all forms (public + filtered by status)
const getForms = async (req, res) => {
  try {
    const { category, practice_area, is_free, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Check if tables exist first
    const tablesExist = await Promise.all([
      db.schema.hasTable('legal_forms'),
      db.schema.hasTable('form_categories')
    ]);

    if (!tablesExist[0]) {
      console.log('⚠️ legal_forms table does not exist, returning empty result');
      return res.json({
        forms: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      });
    }

    let query = db('legal_forms')
      .leftJoin('form_categories', 'legal_forms.category_id', 'form_categories.id')
      .select('legal_forms.*', 'form_categories.name as category_name')
      .where('legal_forms.status', 'approved');

    if (category) query = query.where('legal_forms.category_id', category);
    if (practice_area) query = query.where('legal_forms.practice_area', practice_area);
    if (is_free !== undefined) query = query.where('legal_forms.is_free', is_free === 'true');
    if (search) {
      query = query.where(function() {
        this.where('legal_forms.title', 'like', `%${search}%`)
            .orWhere('legal_forms.description', 'like', `%${search}%`);
      });
    }

    // Separate count query without join to avoid GROUP BY issues
    let countQuery = db('legal_forms').where('status', 'approved');
    if (category) countQuery = countQuery.where('category_id', category);
    if (practice_area) countQuery = countQuery.where('practice_area', practice_area);
    if (is_free !== undefined) countQuery = countQuery.where('is_free', is_free === 'true');
    if (search) {
      countQuery = countQuery.where(function() {
        this.where('title', 'like', `%${search}%`)
            .orWhere('description', 'like', `%${search}%`);
      });
    }
    const total = await countQuery.count('id as count').first();
    const forms = await query.orderBy('legal_forms.created_at', 'desc').limit(limit).offset(offset);

    res.json({
      forms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        totalPages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching forms:', error);
    // Return empty result instead of 500 error for better UX
    res.json({
      forms: [],
      pagination: {
        page: parseInt(req.query.page || 1),
        limit: parseInt(req.query.limit || 20),
        total: 0,
        totalPages: 0
      },
      error: 'Database connection issue - please try again later'
    });
  }
};

// Get single form
const getForm = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await db('legal_forms')
      .leftJoin('form_categories', 'legal_forms.category_id', 'form_categories.id')
      .select('legal_forms.*', 'form_categories.name as category_name')
      .where('legal_forms.id', id)
      .first();

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json(form);
  } catch (error) {
    console.error('Error fetching form:', error);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
};

// Lawyer: Create form
const createForm = async (req, res) => {
  try {
    const { title, description, category_id, practice_area, price, is_free } = req.body;
    const file_url = req.file ? `/uploads/forms/${req.file.filename}` : null;

    if (!title || !category_id) {
      return res.status(400).json({ error: 'Title and category are required' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const [formId] = await db('legal_forms').insert({
      title,
      slug: `${slug}-${Date.now()}`,
      description,
      category_id,
      practice_area: practice_area || 'General',
      file_url,
      price: (is_free === 'true' || is_free === true) ? 0 : (price || 0),
      is_free: (is_free === 'true' || is_free === true) ? 1 : 0,
      created_by: req.user.id,
      created_by_type: req.user.role === 'lawyer' ? 'lawyer' : 'admin',
      status: req.user.role === 'admin' ? 'approved' : 'pending'
    });

    res.status(201).json({ message: 'Form created successfully', formId });
  } catch (error) {
    console.error('Error creating form:', error);
    res.status(500).json({ error: 'Failed to create form', details: error.message });
  }
};

// Lawyer: Get own forms
const getMyForms = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Getting forms for lawyer ID:', req.user.id);
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Check if tables exist
    const tablesExist = await Promise.all([
      db.schema.hasTable('legal_forms').catch(() => false),
      db.schema.hasTable('form_categories').catch(() => false)
    ]);

    if (!tablesExist[0]) {
      console.log('legal_forms table missing, returning empty');
      return res.json({
        forms: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      });
    }

    // Get count first
    const total = await db('legal_forms')
      .where('created_by', req.user.id)
      .count('id as count')
      .first()
      .catch(err => {
        console.error('Count query error:', err);
        return { count: 0 };
      });

    // Get forms data
    let formsQuery = db('legal_forms')
      .select('legal_forms.*')
      .where('legal_forms.created_by', req.user.id)
      .orderBy('legal_forms.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Only join categories if table exists
    if (tablesExist[1]) {
      formsQuery = formsQuery
        .leftJoin('form_categories', 'legal_forms.category_id', 'form_categories.id')
        .select('legal_forms.*', 'form_categories.name as category_name');
    }

    const forms = await formsQuery.catch(err => {
      console.error('Forms query error:', err);
      return [];
    });
    
    res.json({
      forms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count || 0,
        totalPages: Math.ceil((total.count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching my forms:', error);
    res.json({
      forms: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      error: 'Unable to fetch forms'
    });
  }
};

// Lawyer: Update form
const updateForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category_id, practice_area, price, is_free } = req.body;

    const form = await db('legal_forms').where('id', id).first();
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (form.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {
      title,
      description,
      category_id,
      practice_area,
      price: is_free ? 0 : price,
      is_free,
      status: req.user.role === 'admin' ? 'approved' : 'pending'
    };

    if (req.file) {
      updateData.file_url = `/uploads/forms/${req.file.filename}`;
    }

    await db('legal_forms').where('id', id).update(updateData);

    res.json({ message: 'Form updated successfully' });
  } catch (error) {
    console.error('Error updating form:', error);
    res.status(500).json({ error: 'Failed to update form' });
  }
};

// Lawyer: Delete form
const deleteForm = async (req, res) => {
  try {
    const { id } = req.params;

    const form = await db('legal_forms').where('id', id).first();
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (form.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db('legal_forms').where('id', id).del();

    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({ error: 'Failed to delete form' });
  }
};

// Admin: Get all forms (including pending)
const getAllForms = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // First get the total count
    let countQuery = db('legal_forms');
    if (status) countQuery = countQuery.where('status', status);
    const total = await countQuery.count('id as count').first();

    // Then get the actual forms data
    let query = db('legal_forms')
      .leftJoin('form_categories', 'legal_forms.category_id', 'form_categories.id')
      .select('legal_forms.*', 'form_categories.name as category_name');

    if (status) query = query.where('legal_forms.status', status);
    
    const forms = await query
      .orderBy('legal_forms.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      forms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        totalPages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all forms:', error);
    // Return empty result instead of 500 error
    res.json({
      forms: [],
      pagination: {
        page: parseInt(req.query.page || 1),
        limit: parseInt(req.query.limit || 20),
        total: 0,
        totalPages: 0
      },
      error: 'Unable to fetch forms at the moment'
    });
  }
};

// Admin: Approve form
const approveForm = async (req, res) => {
  try {
    const { id } = req.params;

    await db('legal_forms').where('id', id).update({
      status: 'approved',
      approved_by: req.user.id,
      rejection_reason: null
    });

    res.json({ message: 'Form approved successfully' });
  } catch (error) {
    console.error('Error approving form:', error);
    res.status(500).json({ error: 'Failed to approve form' });
  }
};

// Admin: Reject form
const rejectForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await db('legal_forms').where('id', id).update({
      status: 'rejected',
      approved_by: req.user.id,
      rejection_reason: reason
    });

    res.json({ message: 'Form rejected successfully' });
  } catch (error) {
    console.error('Error rejecting form:', error);
    res.status(500).json({ error: 'Failed to reject form' });
  }
};

// Download form
const downloadForm = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get form details - allow downloading own forms regardless of status
    let form;
    if (req.user) {
      // If authenticated, allow downloading own forms or approved forms
      form = await db('legal_forms')
        .where('id', id)
        .where(function() {
          this.where('status', 'approved')
              .orWhere('created_by', req.user.id);
        })
        .first();
    } else {
      // If not authenticated, only approved forms
      form = await db('legal_forms')
        .where('id', id)
        .where('status', 'approved')
        .first();
    }

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (!form.file_url) {
      return res.status(404).json({ error: 'No file available for this form' });
    }

    // Construct file path
    const filePath = path.join(__dirname, '..', form.file_url);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Set headers for download
    const fileName = form.title.replace(/[^a-zA-Z0-9]/g, '_') + path.extname(filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading form:', error);
    res.status(500).json({ error: 'Failed to download form' });
  }
};

// Admin: Get stats
const getFormStats = async (req, res) => {
  try {
    // Use separate queries to avoid GROUP BY issues
    const [totalForms, approvedForms, pendingForms, totalDownloads] = await Promise.all([
      db('legal_forms').count('id as count').first().catch(() => ({ count: 0 })),
      db('legal_forms').where('status', 'approved').count('id as count').first().catch(() => ({ count: 0 })),
      db('legal_forms').where('status', 'pending').count('id as count').first().catch(() => ({ count: 0 })),
      db('user_forms').count('id as count').first().catch(() => ({ count: 0 }))
    ]);

    res.json({
      totalForms: totalForms.count || 0,
      approvedForms: approvedForms.count || 0,
      pendingForms: pendingForms.count || 0,
      totalDownloads: totalDownloads.count || 0
    });
  } catch (error) {
    console.error('Error fetching form stats:', error);
    // Return default stats instead of error
    res.json({
      totalForms: 0,
      approvedForms: 0,
      pendingForms: 0,
      totalDownloads: 0,
      error: 'Unable to fetch stats at the moment'
    });
  }
};

module.exports = {
  getCategories,
  getForms,
  getForm,
  createForm,
  getMyForms,
  updateForm,
  deleteForm,
  downloadForm,
  getAllForms,
  approveForm,
  rejectForm,
  getFormStats
};
