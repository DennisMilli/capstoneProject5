import { handleShowMore, observeArticleCards } from "../utils/articles.js";
import { $, on } from "../utils/dom.js";


export default function initIndex() {
    observeArticleCards();
    handleShowMore("#articles-grid", "#showMoreBtn");
    initMatchdayPicker();
    
    const standingsSection = $("#standings-container");
    if (!standingsSection) return; 
  
    const sidebar = $(".sidebar");
    const menuToggle = $(".menu-toggle"); 
  
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
            standingsSection.classList.toggle("show", entry.intersectionRatio > 0.1);
        });
      },
      { threshold: [0, 0.05, 0.1, 0.5, 1] }
    );
  
    observer.observe(standingsSection);
  
    on("click", ".sidebar a", (e, link) => {
        const href = link.getAttribute("href");
        
        sidebar.classList.remove("active");
        document.body.classList.remove("no-scroll");
        menuToggle.classList.remove("active");

        if (!href.startsWith("#")) return;
        e.preventDefault();
        const handleTransitionEnd = () => {
          sidebar.removeEventListener("transitionend", handleTransitionEnd);
          $(href)?.scrollIntoView({ behavior: "smooth" });
        };
  
        sidebar.addEventListener("transitionend", handleTransitionEnd);
    });
}

function initMatchdayPicker({
  min = 1,
  max = 38,
  current = null
} = {}) {
  const pill = document.querySelector(".matchday-pill");
  const viewport = pill.querySelector(".md-picker-viewport");
  const pageMatchday = Number(document.querySelector(".matchday-number")?.textContent) || null;
  const matchdayBar = document.querySelector(".matchday-bar");
  const start = current ?? pageMatchday ?? min;
  const items = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  if (!pill || !viewport) return;

  let expanded = false;
  let isProgrammaticScroll = false; 
  let isUserScrolling = false;      
  let scrollTimeout = null;

  viewport.innerHTML = "";
  items.forEach((n, index) => {
    const el = document.createElement("div");
    el.className = "md-item";
    el.dataset.value = n;

    el.textContent = `Matchday ${n}`;
    el.setAttribute("role", "option");
    el.dataset.originalIndex = index % items.length; 
    viewport.appendChild(el);
  });

  const listItems = [...viewport.querySelectorAll(".md-item")];
  const itemHeight = listItems[0].getBoundingClientRect().height;
  

  function ClosestItem() {
    const viewportRect = viewport.getBoundingClientRect();
    const centerY = viewportRect.top + viewportRect.height / 2;

    let closest = null;
    let smallest = Infinity;

    listItems.forEach(item => {
      const rect = item.getBoundingClientRect();
      const itemCenter = rect.top + rect.height / 2;
      const dist = Math.abs(centerY - itemCenter);

      if (dist < smallest) {
        smallest = dist;
        closest = item;
      }
    });

    return closest;
  }

  function updateActive() {
    const current = ClosestItem();
    if (!current) return;

    listItems.forEach(i => {
      i.classList.remove("active");
      i.setAttribute("aria-selected", "false");
    });

    current.classList.add("active");
    current.setAttribute("aria-selected", "true");
  }

  function snapToClosest() {
    if (isProgrammaticScroll) return; 
    if (isUserScrolling) return;      

    const closest = ClosestItem();
    if (!closest) return;

    const viewportRect = viewport.getBoundingClientRect();
    const centerY = viewportRect.height / 2;
    const rect = closest.getBoundingClientRect();
    const itemCenter = rect.top - viewportRect.top + rect.height / 2;
    const delta = itemCenter - centerY;

    if (Math.abs(delta) < 1) return;
      isProgrammaticScroll = true;
      viewport.scrollTo({
        top: viewport.scrollTop + delta,
        behavior: "smooth"
      });
      
      setTimeout(() => {
        isProgrammaticScroll = false;
      }, 300);
    
    setTimeout(updateActive, 120);
  }

  pill.addEventListener("click", () => {
    expanded = !expanded;
    pill.classList.add("expanded", expanded);
    matchdayBar.classList.toggle("picker-open", expanded);
  
    if (expanded) {
      const number = Number(document.querySelector(".matchday-number").textContent);
      const index = items.indexOf(number);
      
      isProgrammaticScroll = true;
      viewport.scrollTop = index * itemHeight;
      
      setTimeout(() => {
        isProgrammaticScroll = false;
        updateActive();
      }, 50);
    }
  });

  function closePicker() {
    const active = pill.querySelector(".md-item.active");
    const selected = Number(active?.dataset.value) || start;

    pill.classList.remove("expanded");
    pill.parentElement.classList.remove("picker-open");
  
    window.location.href = `/?matchday=${selected}`;
  }

  viewport.addEventListener("click", (e) => {
    const item = e.target.closest(".md-item");
    if (!item) return ;

    const value = item.dataset.value;
    window.location.href = `/?matchday=${value}`;
    closePicker();
  });

  viewport.addEventListener("scroll", () => {
    if (isProgrammaticScroll) return;
    
    isUserScrolling = true;
    
    updateActive();
    
    if (scrollTimeout) clearTimeout(scrollTimeout);
    
    scrollTimeout = setTimeout(() => {
      isUserScrolling = false;
      snapToClosest();
    }, 140);
  }, { passive: true });

  viewport.addEventListener("wheel", () => {
    isUserScrolling = true;
    if (scrollTimeout) clearTimeout(scrollTimeout);
    
    scrollTimeout = setTimeout(() => {
      isUserScrolling = false;
    }, 100);
  }, { passive: true });

  document.addEventListener("pointerdown", (e) => {
    if (!matchdayBar.classList.contains('picker-open')) return;
  
    if (matchdayBar.contains(e.target)) return;
  closePicker();
  });

  viewport.addEventListener("keydown", (e) => {
    const activeIndex = listItems.findIndex(i => i.classList.contains("active"));
    
    if (e.key === "ArrowDown") {
      isProgrammaticScroll = true;
      const next = Math.min(listItems.length - 1, activeIndex + 1);
      listItems[next].scrollIntoView({ block: "center", behavior: "smooth" });
      e.preventDefault();
      
      setTimeout(() => {
        isProgrammaticScroll = false;
      }, 300);
    }
    if (e.key === "ArrowUp") {
      isProgrammaticScroll = true;
      const prev = Math.max(0, activeIndex - 1);
      listItems[prev].scrollIntoView({ block: "center", behavior: "smooth" });
      e.preventDefault();
      
      setTimeout(() => {
        isProgrammaticScroll = false;
      }, 300);
    }
 
    if (e.key === "Enter" || e.key === "Escape") closePicker();
  });
  
  const initialIndex = items.indexOf(start);
  if (initialIndex !== -1 && listItems[initialIndex]) {
    isProgrammaticScroll = true;
    viewport.scrollTop = initialIndex * itemHeight;
    setTimeout(() => {
      isProgrammaticScroll = false;
      updateActive();
    }, 100);
  }
}
  