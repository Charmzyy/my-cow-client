<template>
    <section class="contact">
      <div class="container">
        <div class="row">
          <div class="col-md-6">
            <div class="contact-info">
              <h2>Contact Information</h2>
              <p>Feel free to reach out to us via the following methods:</p>
              <ul>
                <li><strong>Phone:</strong> 123-456-7890</li>
                <li><strong>Email:</strong> contact@mycowclassifier.com</li>
                <li><strong>Address:</strong> Your Office Address</li>
              </ul>
            </div>
          </div>
          <div class="col-md-6">
            <div class="contact-form">
              <h2>Contact Form</h2>
              <form>
                <div class="mb-3">
                  <label for="name" class="form-label">Your Name</label>
                  <input type="text" class="form-control" id="name" required>
                </div>
                <div class="mb-3">
                  <label for="email" class="form-label">Your Email</label>
                  <input type="email" class="form-control" id="email" required>
                </div>
                <div class="mb-3">
                  <label for="message" class="form-label">Message</label>
                  <textarea class="form-control" id="message" rows="5" required></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Send Message</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  </template>
  
  <style>
  /* Add your existing styles or additional styling here */
  
  /* Adjustments for responsiveness */
  @media (max-width:576px) {
    .contact-info,
    .contact-form {
      text-align: center;
    }
  }
  </style>
  