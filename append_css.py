import os
css_to_append = """
/* ==========================================================================
   Charius Design Overrides for Legacy Static HTML Pages (Public Only)
   ========================================================================== */

.page-hero {
  background-color: #006b61 !important;
  color: #ffffff !important;
  padding: 6rem 0 5rem !important;
  margin: 0 !important;
  position: relative;
  overflow: hidden;
}

.page-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.1), transparent);
  pointer-events: none;
}

.page-hero h1 {
  color: #ffffff !important;
  font-size: clamp(2.5rem, 5vw, 4rem) !important;
  font-weight: 700 !important;
  letter-spacing: -0.025em !important;
  max-width: 900px !important;
  line-height: 1.15 !important;
  margin-bottom: 1.5rem !important;
}

.page-hero p.kicker {
  color: #FA7D15 !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  margin-bottom: 1rem !important;
}

.page-hero p:not(.kicker) {
  color: rgba(255, 255, 255, 0.9) !important;
  font-size: 1.125rem !important;
  line-height: 1.625 !important;
  max-width: 800px !important;
  font-weight: 300 !important;
}

.section {
  background-color: #FAF5EF; /* Charius beige */
  padding: 4rem 1rem !important;
}

.cards-grid .card {
  background-color: #ffffff !important;
  border-radius: 1rem !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03) !important;
  border: 1px solid rgba(0,0,0,0.02) !important;
  padding: 2.5rem !important;
  transition: box-shadow 0.2s ease-in-out;
}

.cards-grid .card:hover {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06) !important;
}

.cards-grid .card h2 {
  color: #111111 !important;
  font-weight: 700 !important;
  font-size: 1.5rem !important;
  margin-bottom: 1.25rem !important;
  letter-spacing: -0.01em !important;
}

.cards-grid .card p, 
.cards-grid .card li {
  color: #4b5563 !important;
  line-height: 1.625 !important;
  font-size: 1.05rem !important;
  margin-bottom: 0.75rem !important;
}

.cards-grid .card ul {
  list-style-type: none !important;
  padding-left: 0 !important;
}

.cards-grid .card li {
  position: relative;
  padding-left: 1.5rem;
}

.cards-grid .card li::before {
  content: "•";
  color: #FA7D15;
  font-weight: bold;
  position: absolute;
  left: 0;
  top: 0;
}
"""

with open("src/app/globals.css", "a") as f:
    f.write(css_to_append)
print("Injected CSS overrides successfully.")
