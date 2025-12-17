// Register GSAP Plugins
gsap.registerPlugin(ScrollTrigger);

// --- Data Management ---
let allPhotos = [];
let activeCategories = new Set();
let showFavoritesOnly = false;
let currentModalPhoto = null;
let currentCollectionIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadPhotos();
    initAnimations();
    setupStaticEventListeners();
    setupMobileSidebarToggle();
    setupWindowResizeHandler();
}

// 处理窗口大小改变事件
function setupWindowResizeHandler() {
    window.addEventListener('resize', function () {
        const sidebar = document.querySelector('.sidebar');
        // 如果从移动端切换到桌面端，移除expanded类
        if (window.innerWidth > 768) {
            sidebar.classList.remove('expanded');
        }
    });
}

// 设置移动端侧边栏切换功能
// 设置移动端侧边栏切换功能
function setupMobileSidebarToggle() {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.querySelector('.mobile-toggle-btn');

    if (!sidebar) return;

    // 仅在移动端生效
    if (window.innerWidth <= 768) {

        // 1. Toggle Button Click
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('expanded');
            });
        }

        // 2. Click Outside to Close
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('expanded') &&
                !sidebar.contains(e.target) &&
                !e.target.closest('.mobile-toggle-btn')) {

                sidebar.classList.remove('expanded');
            }
        });

        // 3. Click Nav Item to Close
        const navItems = sidebar.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                sidebar.classList.remove('expanded');
            });
        });
    }
}

// --- GSAP Animations ---
// --- GSAP Animations ---
function initAnimations() {
    // 1. Custom Cursor Logic
    const cursor = document.querySelector('.cursor-follower');
    document.addEventListener('mousemove', (e) => {
        gsap.to(cursor, {
            x: e.clientX,
            y: e.clientY,
            duration: 0.1,
            ease: 'power2.out'
        });
    });

    // 2. Velocity Scroll Skew (Shocking Effect)
    const gallery = document.querySelector('.masonry-container');

    // Create a proxy to track scroll velocity using ScrollTrigger
    ScrollTrigger.create({
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
            // Skew based on velocity (clamp to avoid excessive distortion)
            const skew = self.getVelocity() / 300;
            const clampedSkew = Math.max(-10, Math.min(10, skew)); // Clamp between -10 and 10 deg

            gsap.to(gallery, {
                skewY: clampedSkew,
                scale: 1 - Math.abs(clampedSkew / 100), // Subtle shrink when fast
                overwrite: true,
                duration: 0.2, // Quick return
                ease: 'power1.out'
            });
        }
    });

    // Hero Title Reveal
    gsap.to('.hero-title', {
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: 'power4.out',
        delay: 0.2
    });

    gsap.to('.hero-subtitle', {
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: 'power4.out',
        delay: 0.5
    });
}

// --- Data Loading ---
async function loadPhotos() {
    try {
        const response = await fetch('photos.json');
        if (!response.ok) throw new Error('Failed to load photos');
        allPhotos = await response.json();

        generateDynamicFilters(allPhotos);
        renderGallery(allPhotos);

    } catch (error) {
        console.error('Error:', error);
        document.querySelector('.masonry-container').innerHTML = '<p style="text-align:center; padding: 2rem;">Error loading photos.</p>';
    }
}

// --- Dynamic Filter Generation ---
function generateDynamicFilters(photos) {
    const container = document.getElementById('dynamic-filters');
    if (!container) return;
    container.innerHTML = ''; // Clear existing

    // Extract unique categories
    const categories = [...new Set(photos.map(p => p.category))].filter(Boolean);

    // Icon mapping
    const iconMap = {
        '风景': 'fa-mountain',
        'Landscape': 'fa-mountain',
        '建筑': 'fa-city',
        'City': 'fa-city',
        '人物': 'fa-user',
        'Portrait': 'fa-user',
        '自然': 'fa-leaf',
        'Natural': 'fa-leaf',
        '微距': 'fa-bacterium',
        'Macro': 'fa-bacterium',
        '静物': 'fa-coffee'
    };

    categories.forEach(cat => {
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'nav-item filter-btn';
        link.dataset.category = cat;

        const iconClass = iconMap[cat] || 'fa-tag';

        link.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <span>${cat}</span>
        `;

        // 添加触摸和点击事件支持，确保在移动设备上正常工作
        link.addEventListener('click', (e) => {
            e.preventDefault();
            toggleCategory(cat, link);
        });

        // 添加触摸事件支持，提高移动端兼容性
        link.addEventListener('touchstart', (e) => {
            // 不阻止默认行为，但阻止事件冒泡
            e.stopPropagation();
            toggleCategory(cat, link);
        });

        // 防止移动端点击时的默认行为和页面滚动
        link.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        container.appendChild(link);
    });
}

// --- Filtering Logic ---
function toggleCategory(category, element) {
    // Toggle Set
    if (activeCategories.has(category)) {
        activeCategories.delete(category);
        element.classList.remove('active');
    } else {
        activeCategories.add(category);
        element.classList.add('active');
    }

    // Turn off "Home" active state if filters are customized
    const homeBtn = document.getElementById('nav-all');
    if (activeCategories.size > 0 || showFavoritesOnly) {
        homeBtn.classList.remove('active');
    } else {
        homeBtn.classList.add('active');
    }

    applyFilters();
}

function applyFilters() {
    let filtered = allPhotos;

    // 1. Category Filter (Additive: OR logic)
    if (activeCategories.size > 0) {
        filtered = filtered.filter(p => activeCategories.has(p.category));
    }

    // 2. Favorites Filter (AND logic with categories)
    if (showFavoritesOnly) {
        filtered = filtered.filter(p => p.isFeatured || p.isFavorite);
    }

    renderGallery(filtered);
}

// --- Rendering ---
function renderGallery(photos) {
    const galleryContainer = document.querySelector('.masonry-container');
    galleryContainer.innerHTML = '';

    if (photos.length === 0) {
        galleryContainer.innerHTML = '<p style="text-align:center;width:100%;padding:2rem;color:#888;">No photos match your criteria.</p>';
        return;
    }

    photos.forEach((photo, index) => {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        // Add collection class for CSS stacking
        if (photo.isCollection) item.classList.add('is-collection');

        item.dataset.id = photo.id;

        item.innerHTML = `
            <div class="img-wrapper">
                <img src="${photo.imageUrl}" alt="${photo.title}" loading="lazy" class="main-img">
            </div>
            <div class="item-overlay">
                <h3 class="item-title">${photo.title}</h3>
                <p style="color:rgba(255,255,255,0.8); font-size:0.9rem;">
                    ${photo.category} ${photo.isCollection ? '<i class="fas fa-layer-group" style="margin-left:5px"></i>' : ''}
                </p>
            </div>
        `;

        // Interaction - 支持桌面端和移动端
        item.addEventListener('click', () => openModal(photo));

        // 添加触摸事件支持，提高移动端兼容性
        item.addEventListener('touchstart', (e) => {
            // 防止事件冒泡
            e.stopPropagation();
        });

        item.addEventListener('touchend', (e) => {
            // 阻止默认行为，防止页面滚动
            e.preventDefault();
            e.stopPropagation();
            // 打开模态框
            openModal(photo);
        });

        // Hover Slideshow for Collections
        if (photo.isCollection && photo.collectionImages && photo.collectionImages.length > 1) {
            setupHoverSlideshow(item, photo.collectionImages);
        }

        galleryContainer.appendChild(item);

        // Animate Entry with GSAP
        gsap.to(item, {
            scrollTrigger: {
                trigger: item,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
            },
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            delay: (index % 3) * 0.1 // Stagger based on column
        });
    });

    ScrollTrigger.refresh();
}

function setupHoverSlideshow(item, images) {
    let interval;
    let idx = 0;
    const imgElement = item.querySelector('.main-img');
    const originalSrc = imgElement.src;

    item.addEventListener('mouseenter', () => {
        idx = 0; // Start next image immediately? Or keep original first?
        interval = setInterval(() => {
            idx = (idx + 1) % images.length;
            imgElement.style.opacity = 0.8; // Brief fade effect (simulated)
            setTimeout(() => {
                imgElement.src = images[idx];
                imgElement.style.opacity = 1;
            }, 100);
        }, 1200); // Change every 1.2s
    });

    item.addEventListener('mouseleave', () => {
        clearInterval(interval);
        imgElement.src = originalSrc; // Reset to cover
    });
}

// --- Event Listeners ---
function setupStaticEventListeners() {
    // Home Button (Reset)
    const homeBtn = document.getElementById('nav-all');
    if (homeBtn) {
        // 添加点击事件
        homeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            activeCategories.clear();
            showFavoritesOnly = false;

            // Visual reset
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('[data-type="favorite"]').forEach(btn => btn.classList.remove('active'));
            homeBtn.classList.add('active');

            applyFilters();
        });

        // 添加触摸事件支持，提高移动端兼容性
        homeBtn.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        });

        homeBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();

            activeCategories.clear();
            showFavoritesOnly = false;

            // Visual reset
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('[data-type="favorite"]').forEach(btn => btn.classList.remove('active'));
            homeBtn.classList.add('active');

            applyFilters();
        });
    }

    // Favorites Button
    const favBtn = document.querySelector('[data-type="favorite"]');
    if (favBtn) {
        // 添加点击事件
        favBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showFavoritesOnly = !showFavoritesOnly;

            if (showFavoritesOnly) {
                favBtn.classList.add('active');
                document.getElementById('nav-all').classList.remove('active');
            } else {
                favBtn.classList.remove('active');
                if (activeCategories.size === 0) document.getElementById('nav-all').classList.add('active');
            }
            applyFilters();
        });

        // 添加触摸事件支持，提高移动端兼容性
        favBtn.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        });

        favBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();

            showFavoritesOnly = !showFavoritesOnly;

            if (showFavoritesOnly) {
                favBtn.classList.add('active');
                document.getElementById('nav-all').classList.remove('active');
            } else {
                favBtn.classList.remove('active');
                if (activeCategories.size === 0) document.getElementById('nav-all').classList.add('active');
            }
            applyFilters();
        });
    }

    // Modal Close
    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);

        // 添加触摸事件支持，提高移动端兼容性
        closeBtn.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        });

        closeBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
    }

    // Global Key Events
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') navigateCollection(-1);
        if (e.key === 'ArrowRight') navigateCollection(1);
    });
}

// --- Modal Logic ---
function openModal(photo) {
    currentModalPhoto = photo;
    currentCollectionIndex = 0;

    const modal = document.querySelector('.full-modal');
    const modalImg = modal.querySelector('.modal-img-container img');
    const modalTitle = modal.querySelector('.modal-title');
    const modalDesc = modal.querySelector('.modal-desc');
    const modalMeta = modal.querySelector('.modal-meta');

    // Populate data
    updateModalImage();
    modalTitle.textContent = photo.title;
    modalDesc.textContent = photo.collectionDescription || photo.description || 'No description available.';

    // Build Meta HTML
    let metaHtml = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 2rem;">`;
    if (photo.camera) metaHtml += `<div><small style="color:#666">Camera</small><br>${photo.camera}</div>`;
    if (photo.lens) metaHtml += `<div><small style="color:#666">Lens</small><br>${photo.lens}</div>`;
    if (photo.aperture) metaHtml += `<div><small style="color:#666">Aperture</small><br>${photo.aperture}</div>`;
    if (photo.iso) metaHtml += `<div><small style="color:#666">ISO</small><br>${photo.iso}</div>`;
    metaHtml += `</div>`;

    // FILMSTRIP: Only for collections
    if (photo.isCollection && photo.collectionImages && photo.collectionImages.length > 1) {
        // We append the filmstrip OUTSIDE metaHtml, perhaps in a new container or at the bottom of modal-details
        // Let's create a dedicated wrapper if it doesn't exist, or just inject HTML
        // But we need click events. So creating elements is better.

        let filmstripHtml = `<div class="modal-filmstrip">`;
        photo.collectionImages.forEach((src, i) => {
            filmstripHtml += `<img src="${src}" class="filmstrip-thumb ${i === 0 ? 'active' : ''}" data-index="${i}">`;
        });
        filmstripHtml += `</div>`;

        // Append to details (bottom)
        modalMeta.innerHTML = metaHtml + '<div style="margin-top:2rem"><small style="color:#666">Collection Preview</small></div>' + filmstripHtml;

        // Bind Filmstrip Clicks
        setTimeout(() => {
            const thumbs = modal.querySelectorAll('.filmstrip-thumb');
            thumbs.forEach(thumb => {
                // 添加点击事件
                thumb.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    currentCollectionIndex = idx;
                    updateModalImage();

                    // Update active state
                    thumbs.forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');
                });

                // 添加触摸事件支持，提高移动端兼容性
                thumb.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                });

                thumb.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const idx = parseInt(e.target.dataset.index);
                    currentCollectionIndex = idx;
                    updateModalImage();

                    // Update active state
                    thumbs.forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');
                });
            });
        }, 50);

    } else {
        modalMeta.innerHTML = metaHtml;
    }

    // Previous/Next Buttons (Optional, if user still wants them alongside filmstrip)
    // Filmstrip largely replaces them, but keys still work basically.

    modal.classList.add('active');

    // 添加移动端手势滑动支持
    setupModalSwipeGestures(modal);
}

function updateModalImage() {
    const modalImg = document.querySelector('.modal-img-container img');
    const indexSpan = document.getElementById('imgIndex');

    if (currentModalPhoto.isCollection && currentModalPhoto.collectionImages) {
        modalImg.src = currentModalPhoto.collectionImages[currentCollectionIndex];
        if (indexSpan) indexSpan.textContent = currentCollectionIndex + 1;
    } else {
        modalImg.src = currentModalPhoto.imageUrl;
    }
}

function navigateCollection(direction) {
    if (!currentModalPhoto || !currentModalPhoto.collectionImages) return;

    currentCollectionIndex += direction;
    if (currentCollectionIndex < 0) currentCollectionIndex = currentModalPhoto.collectionImages.length - 1;
    if (currentCollectionIndex >= currentModalPhoto.collectionImages.length) currentCollectionIndex = 0;

    updateModalImage();
}

function closeModal() {
    document.querySelector('.full-modal').classList.remove('active');
    currentModalPhoto = null;
}

// 设置模态框手势滑动支持
function setupModalSwipeGestures(modal) {
    let startX = 0;
    let startY = 0;

    // 触摸开始
    modal.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    });

    // 触摸结束
    modal.addEventListener('touchend', (e) => {
        if (!startX || !startY) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;

        const diffX = startX - endX;
        const diffY = startY - endY;

        // 检查是否是水平滑动且滑动距离足够
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            if (diffX > 0) {
                // 向左滑动，显示下一张图片
                navigateCollection(1);
            } else {
                // 向右滑动，显示上一张图片
                navigateCollection(-1);
            }
        }

        // 重置起始位置
        startX = 0;
        startY = 0;
    });
}
