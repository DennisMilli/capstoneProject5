import { on } from "../utils/dom.js";
import { shareArticle } from "../utils/articles.js";

export default class AppCore {
  constructor() {
    this.init();
  }   

  init() {
    this.setupErrorHandling();
    this.setupUniversalListeners();
    this.setupNavigation();
    this.setupEscapeKeyHandler();
    this.setupGlobalClickOutside();
    this.setupGlobalListeners();
    console.log('✅ AppCore initialized');
  }
  setupErrorHandling() {
    window.addEventListener("error", e => {
      console.error("💥 JS Error:", e.error);
    });

    window.addEventListener("unhandledrejection", e => {
      console.error("💥 Unhandled Promise:", e.reason);
    });
  };

  setupUniversalListeners() {
    document.addEventListener("click", (e) => {
      const anchor = e.target.closest("a[href^='#']");
      if (anchor) {
          e.preventDefault();  
          this.handleSmoothScroll(anchor);
      }

      const modalTrigger = e.target.closest("[data-modal]");
      if (modalTrigger) this.openModal(modalTrigger.dataset.modal);

      const modalClose = e.target.closest("[data-close]");
      if (modalClose) this.closeAllModals();
    });

    document.addEventListener("submit", (e) => {
      if (e.target.matches("[data-ajax]")) {
        e.preventDefault();
        console.warn("⚠️ AJAX form detected — handle in module/page.");
      }
    });
  }

  setupNavigation() {
    const menuToggle = this.safeQuery(".menu-toggle");
    const sidebar = this.safeQuery(".sidebar");

    if (!menuToggle || !sidebar) return;

    menuToggle.addEventListener("click", () => {
      menuToggle.classList.toggle("active");
      sidebar.classList.toggle("active");
      document.body.classList.toggle("no-scroll");
    });
  }
  
  setupEscapeKeyHandler() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAllModals();
    });
  }
    
  setupGlobalClickOutside() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
        this.closeAllModals();
        }
    });
  }
  setupGlobalListeners() {
    on("click", ".share-icon", (e, icon) => {
        e.preventDefault();
    
        const card = icon.closest(".article-card");
        if (!card) return;
    
        const link = card.querySelector(".article-link")?.getAttribute("href");
        const title = card.querySelector(".article-title")?.textContent;
    
        if (!link) return;
    
        const fullUrl = `${window.location.origin}${link}`;
        shareArticle(fullUrl, title);
    });
  }
  handleSmoothScroll(link) {
    const target = this.safeQuery(link.getAttribute("href"));
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  }

  openModal(id) {
    const modal = this.safeQuery(`#${id}`);
    if (!modal) return;
    modal.classList.add("active");
    document.body.classList.add("no-scroll");
  }

  closeAllModals() {
    this.safeQueryAll(".modal-overlay.active").forEach(modal =>
      modal.classList.remove("active")
    );
    document.body.classList.remove("no-scroll");
  }

  safeQuery(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (error) {
      console.warn(`Invalid selector: "${selector}"`, error);
      return null;
    }
  }

  safeQueryAll(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }

  async safeFetch(url, options = {}) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await res.json();
      }
      return await res.text(); 
    } catch (err) {
      console.error("❌ Fetch failed:", err);
      return null;
    }
  }
}