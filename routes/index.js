const express = require('express');
const router = express.Router();
const path = require('path');

// Import models
const modelsPath = path.join(__dirname, '..', 'models');
const {
    Product,
    JobPost,
    Category,
    User,
    ArtisanProfile
} = require(modelsPath);
const { Op } = require('sequelize');

/**
 * Home page route - with featured products and jobs
 */
router.get('/', async (req, res) => {
    try {
        // Get featured products (latest 6)
        const featuredProducts = await Product.findAll({
            limit: 6,
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'seller', attributes: ['id', 'name'] },
                { model: Category, as: 'category', attributes: ['id', 'name'] }
            ]
        });

        // Get recent job posts (latest 6)
        const recentJobs = await JobPost.findAll({
            where: { status: 'open' },
            limit: 6,
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'client', attributes: ['id', 'name'] }
            ]
        });

        res.render('index', {
            title: 'Home',
            page: 'home',
            featuredProducts: featuredProducts || [],
            recentJobs: recentJobs || []
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.render('index', {
            title: 'Home',
            page: 'home',
            featuredProducts: [],
            recentJobs: []
        });
    }
});

/**
 * Providers page route - with artisan listings
 */
router.get('/providers', async (req, res) => {
    try {
        // Get all providers/artisans (filter by is_available instead of verification_status)
        const providers = await ArtisanProfile.findAll({
            where: { is_available: true },
            limit: 12,
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
            ]
        });

        res.render('providers', {
            title: 'Providers',
            page: 'providers',
            providers: providers || []
        });
    } catch (error) {
        console.error('Error loading providers:', error);
        res.render('providers', {
            title: 'Providers',
            page: 'providers',
            providers: []
        });
    }
});

/**
 * Jobs page route - with job listings
 */
router.get('/jobs', async (req, res) => {
    try {
        // Get all open jobs
        const jobs = await JobPost.findAll({
            where: { status: 'open' },
            limit: 20,
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'client', attributes: ['id', 'name'] }
            ]
        });

        res.render('jobs', {
            title: 'Post a Job',
            page: 'jobs',
            jobs: jobs || []
        });
    } catch (error) {
        console.error('Error loading jobs:', error);
        res.render('jobs', {
            title: 'Post a Job',
            page: 'jobs',
            jobs: []
        });
    }
});

/**
 * Materials page route - with product listings
 */
router.get('/materials', async (req, res) => {
    try {
        // Get all products
        const products = await Product.findAll({
            limit: 20,
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'seller', attributes: ['id', 'name'] },
                { model: Category, as: 'category', attributes: ['id', 'name'] }
            ]
        });

        // Get categories for filter
        const categories = await Category.findAll({
            attributes: ['id', 'name']
        });

        res.render('materials', {
            title: 'Materials',
            page: 'materials',
            products: products || [],
            categories: categories || []
        });
    } catch (error) {
        console.error('Error loading materials:', error);
        res.render('materials', {
            title: 'Materials',
            page: 'materials',
            products: [],
            categories: []
        });
    }
});

/**
 * Training page route - now handled by training routes
 */
// Removed - handled by /training router

module.exports = router;
