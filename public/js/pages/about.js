export default function initAbout() {
    const reveals = document.querySelectorAll(".reveal");

    const revealObserver = new IntersectionObserver(
    entries => {
        entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("active");
        }
        });
    },
    { threshold: 0.10 }
    );

    reveals.forEach(el => revealObserver.observe(el));

    
    const counters = document.querySelectorAll(".stat h3");
    const statsSection = document.querySelector(".stats-div");
    let hasAnimated = false;

    const countUp = (el) => {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || "";
    let current = 0;
    const increment = target / 100;

    const update = () => {
        current += increment;
        if (current < target) {
        el.textContent = Math.ceil(current) + suffix;
        requestAnimationFrame(update);
        } else {
        el.textContent = target + suffix;
        }
    };

    update();
    };

    const counterObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
        if (entry.isIntersecting && !hasAnimated) {
            counters.forEach(countUp);
            hasAnimated = true;
        }
        });
    },
    { threshold: 0.5 }
    );

    counterObserver.observe(statsSection);

} 