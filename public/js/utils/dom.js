
export function $(selector, scope = document) {
    if (!selector) return null;
    if (selector instanceof Element) return selector;
    return scope.querySelector(selector);
}

export function $all(selector, scope = document) {
    return [...scope.querySelectorAll(selector)];
}

export function addClass(el, className) {
    if (el) el.classList.add(className);
}

export function removeClass(el, className) {
    if (el) el.classList.remove(className);
}

export function toggleClass(el, className) {
    if (el) el.classList.toggle(className);
}

export function on(event, selector, handler, scope = document) {
    scope.addEventListener(event, (e) => {
        const el = e.target.closest(selector);
        if (!el) return;
        handler(e, el);
        console.log(el)
    });
}


  