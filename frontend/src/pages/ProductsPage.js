import React, { useState, useEffect } from 'react';
import { productsAPI } from '../services/api';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaBoxes, FaExclamationTriangle, FaFilter } from 'react-icons/fa';
import { formatCurrency, formatNumber, isLowStock } from '../utils/helpers';
import toast from 'react-hot-toast';
import '../styles/Products.css';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: '',
    subcategory: '',
    costPrice: '',
    sellingPrice: '',
    wholesalePrice: '',
    vatType: 'vatable',
    unitOfMeasure: 'pcs',
    stockQuantity: '0',
    reorderLevel: '10',
    expiryTracking: false,
    description: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [pagination.page, selectedCategory, showLowStock]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        category: selectedCategory || undefined,
        lowStock: showLowStock || undefined
      };
      const response = await productsAPI.getAll(params);
      setProducts(response.data.data);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await productsAPI.getCategories();
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to load categories');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchTerm.length < 2) {
      fetchProducts();
      return;
    }

    setLoading(true);
    try {
      const response = await productsAPI.search(searchTerm);
      setProducts(response.data.data);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : parseFloat(formData.sellingPrice),
        stockQuantity: parseFloat(formData.stockQuantity),
        reorderLevel: parseFloat(formData.reorderLevel)
      };

      if (editingProduct) {
        await productsAPI.update(editingProduct.id, data);
        toast.success('Product updated successfully');
      } else {
        await productsAPI.create(data);
        toast.success('Product created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchProducts();
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode,
      category: product.category,
      subcategory: product.subcategory || '',
      costPrice: product.cost_price,
      sellingPrice: product.selling_price,
      wholesalePrice: product.wholesale_price || '',
      vatType: product.vat_type,
      unitOfMeasure: product.unit_of_measure,
      stockQuantity: product.stock_quantity,
      reorderLevel: product.reorder_level,
      expiryTracking: product.expiry_tracking,
      description: product.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await productsAPI.delete(id);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      barcode: '',
      category: '',
      subcategory: '',
      costPrice: '',
      sellingPrice: '',
      wholesalePrice: '',
      vatType: 'vatable',
      unitOfMeasure: 'pcs',
      stockQuantity: '0',
      reorderLevel: '10',
      expiryTracking: false,
      description: ''
    });
    setEditingProduct(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="products-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage your product inventory</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FaPlus /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="input-with-icon">
            <FaSearch className="input-icon" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        <div className="filter-buttons">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {categories.map((cat, index) => (
              <option key={index} value={cat.category}>
                {cat.category} ({cat.product_count})
              </option>
            ))}
          </select>

          <button
            className={`btn ${showLowStock ? 'btn-warning' : 'btn-outline'}`}
            onClick={() => setShowLowStock(!showLowStock)}
          >
            <FaExclamationTriangle /> Low Stock
          </button>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Barcode</th>
                  <th>Category</th>
                  <th>Cost Price</th>
                  <th>Selling Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                      <FaBoxes style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px' }} />
                      <p>No products found</p>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="product-name-cell">
                          <strong>{product.name}</strong>
                          {product.description && (
                            <small>{product.description.substring(0, 50)}...</small>
                          )}
                        </div>
                      </td>
                      <td>{product.barcode}</td>
                      <td>
                        <span className="badge badge-info">{product.category}</span>
                      </td>
                      <td>{formatCurrency(product.cost_price)}</td>
                      <td className="price-cell">{formatCurrency(product.selling_price)}</td>
                      <td>
                        <span className={`stock-badge ${isLowStock(product.stock_quantity, product.reorder_level) ? 'low-stock' : ''}`}>
                          {formatNumber(product.stock_quantity)} {product.unit_of_measure}
                        </span>
                      </td>
                      <td>
                        {product.status === 'active' ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-danger">Inactive</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-icon btn-icon-primary"
                            onClick={() => handleEdit(product)}
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn-icon btn-icon-danger"
                            onClick={() => handleDelete(product.id, product.name)}
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-grid">
                <div className="input-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Barcode *</label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    required
                    disabled={!!editingProduct}
                  />
                </div>

                <div className="input-group">
                  <label>Category *</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    list="categories-list"
                  />
                  <datalist id="categories-list">
                    {categories.map((cat, index) => (
                      <option key={index} value={cat.category} />
                    ))}
                  </datalist>
                </div>

                <div className="input-group">
                  <label>Subcategory</label>
                  <input
                    type="text"
                    name="subcategory"
                    value={formData.subcategory}
                    onChange={handleChange}
                  />
                </div>

                <div className="input-group">
                  <label>Cost Price *</label>
                  <input
                    type="number"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Selling Price *</label>
                  <input
                    type="number"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Wholesale Price</label>
                  <input
                    type="number"
                    name="wholesalePrice"
                    value={formData.wholesalePrice}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="input-group">
                  <label>VAT Type *</label>
                  <select name="vatType" value={formData.vatType} onChange={handleChange} required>
                    <option value="vatable">Vatable (16%)</option>
                    <option value="zero_rated">Zero Rated</option>
                    <option value="exempt">Exempt</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Unit of Measure *</label>
                  <select name="unitOfMeasure" value={formData.unitOfMeasure} onChange={handleChange} required>
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="g">Grams</option>
                    <option value="l">Litres</option>
                    <option value="ml">Millilitres</option>
                    <option value="box">Box</option>
                    <option value="pack">Pack</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Stock Quantity *</label>
                  <input
                    type="number"
                    name="stockQuantity"
                    value={formData.stockQuantity}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Reorder Level *</label>
                  <input
                    type="number"
                    name="reorderLevel"
                    value={formData.reorderLevel}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="input-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="expiryTracking"
                      checked={formData.expiryTracking}
                      onChange={handleChange}
                    />
                    Enable Expiry Tracking
                  </label>
                </div>
              </div>

              <div className="input-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
