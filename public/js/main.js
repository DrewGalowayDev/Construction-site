/**
 * TopLine Marketplace - Main JavaScript
 */

// WhatsApp phone number for form submissions
const WA = "";

// Utility function to get element by ID
const $ = id => document.getElementById(id);

/**
 * Display a toast notification message
 * @param {string} m - Message to display
 */
function toast(m) {
    const t = $("t");
    t.textContent = m;
    t.style.display = "block";
    clearTimeout(t._);
    t._ = setTimeout(() => t.style.display = "none", 5000);
}

/**
 * Handle form submission and send via WhatsApp
 * @param {Event} e - Form submit event
 * @param {string} title - Title for the WhatsApp message
 * @param {string} ok - Success message to display
 * @returns {boolean} false to prevent default form submission
 */
function send(e, title, ok) {
    e.preventDefault();
    const f = e.target;
    const lines = [title];
    
    // Collect form data
    [...f.elements].forEach(x => {
        if (x.name && x.value) {
            lines.push(x.name + ": " + x.value);
        }
    });
    
    // Check if WhatsApp number is configured
    if (!WA) {
        toast("This form is not connected yet — nothing was sent.");
        return false;
    }
    
    // Send via WhatsApp
    window.open(
        "https://wa.me/" + WA + "?text=" + encodeURIComponent(lines.join("\n")),
        "_blank"
    );
    
    toast(ok);
    f.reset();
    return false;
}
