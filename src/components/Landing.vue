<template>
<section class="hero">
    <div class="container">
        <div class="row align-items-center">
            <!-- text -->
            <div class="col-md-6">
                <img src="../assets/logo.png" alt="hero-img" class="w-50">
            </div>
            <div class="col-md-6">
                <div class="text">
                    Welcome to MyCow Get your cow classified within seconds
                </div>
                <div class="buttons mt-3">
                    
                    <router-link to="/register" class="btn btn-secondary btn-lg">Register</router-link>
                    <router-link to="/login" class="btn btn-outline-secondary btn-lg ms-3 ">Login</router-link>
                    
                </div>
            </div>

    <!-- image -->
            
        </div>
    </div>
</section>
<section class="setup">
    <div class="container">
        <div class="text-header text-center">
            <h3>Lets Get started Quickly</h3>
            <p>Effortlessly classify your cow by following these simple steps</p>
        </div>
        <div class="items text-center">
            <div class="row">
                <div class="col-md-4">
                    <div class="icons">
                        <img src="../assets/register.jpeg" alt="icons">
                    </div>
                    <div class="desc">
                        <h5>Create Account</h5>
                        <p>Begin your journey with MyCow Classifier by creating your account.
                             Enter your details to access our platform's features and image submission process seamlessly</p>
                    </div>

                </div>
                <div class="col-md-4">
                    <div class="icons">
                        <img src="../assets/camera.jpeg" alt="icons">
                    </div>
                    <div class="desc">
                        <h5>Submit Image</h5>
                        <p>At MyCow Classifier, submit your images effortlessly through our platform.
                             Our advanced model processes them for accurate classification.</p>
                    </div>

                </div>
                <div class="col-md-4">
                    <div class="icons">
                        <img src="../assets/resuts.jpeg" alt="icons">
                    </div>
                    <div class="desc">
                        <h5>Receive Results</h5>
                        <p>Our system generates certificates based on the image classification results,
                     providing you with certified documentation for your records.</p>
                    </div>

                </div>
            </div>
        </div>
    </div>
</section>
<section class="information">
    <div class="container">
        <div class="row info-1">
            <div class="col-md-6">
                <div class="text-infomration"> <h5>Worrying about accuracy</h5>
                <p>At MyCow Classifier, we understand the importance of accuracy in image classification. Our advanced algorithms and dedicated team ensure precise results. 
                    </p>
                    </div>
            </div>
            <div class="col-md-6">
                <img src="../assets/accuracy.jpeg" alt="img-1" class="w-100">
            </div>
        </div>
        <div class="row info-2">
            <div class="col-md-6">
                <img src="../assets/certify.jpeg" alt="img-1" class="w-100">
            </div>
            <div class="col-md-6">
                <div class="text-infomration"> <h5>Certifaction Provided</h5>
                <p>Once your images are processed and analyzed, we provide detailed certifications. These certificates outline the classification results,
                     ensuring transparency and reliability in the information provided to you</p>
                    </div>
            </div>
            
        </div>
        
    </div>
</section>
<footer>
    <div class="container">
      <div class="row">
        <div class="col-md-6">
          <div class="row row-cols-1 row-cols-lg-5 g-2 lg-3">
            <div class="col-md-3">
              <div>
                <small><a href="#" class="text-decoration-none">Phone: 123-456-7890</a></small>
              </div>
            </div>
            <div class="col-md-3">
              <div>
                <small><a href="#" class="text-decoration-none">Location: Your Office Address</a></small>
              </div>
            </div>
            <div class="col-md-3">
              <div>
                <small><a href="#" class="text-decoration-none">Email: contact@mycowclassifier.com</a></small>
              </div>
            </div>
          </div>
        </div>
        <div class="copy">
          &copy; 2024 MyCow Classifier
        </div>
      </div>
    </div>
  </footer>

</template>
<style>
.btn{
    border-radius: 8px;
    
}
.btn-primary,
.btn-outline-secondary {
    padding:12px 20px;
}

.btn-primary {
    background-color: #3155e7;
}
.btn-primary:hover {
    background-color: #2045d6;
}
.btn-outline-secondary{
border: 1px solid #d3d4db;
color:#010101;

}
.btn-outline-secondary:hover {
    background-colour :#d3d4db;
    border: 1px solid #d3d4db;
color: #010101;
}

.navbar {
  padding: 20px 0;
}

.navbar-brand {
  font-size: 24px; /* Adjust font size */
}

.navbar-nav {
  margin-left: auto;
}

.nav-link {
  font-size: 16px;
  color: black;
  margin-left: 0;
}

.nav-link.active {
  font-weight: bold;
  color: #010101;
}
section.hero {padding:40px 0;

}
section .hero .text{
    font-weight:800;
    font-size:48px;
    line-height:73px;
    color:#010101;

}
.buttons {
    padding-top:30px;

}
.buttons .btn {
    font-size:16px;
    font-weight:bold;
    line-height: 24px;
}
section.setup {
    padding:100px 0;

}
section.setup .text-header h3{
    font-size:42px;
    font-weight:700;
    line-height:48px;
    color: #010101;
    padding:20px 0;
}
section.setup .text-header h3{
    font-size:18px;
    font-weight:400;
    line-height:28px;
    color: black;
    padding: 27px 0;
}
section.setup .fcons {
    padding:10px 0;

}
section.setup .icons img {
    width: 150px; /* Set the width */
    height: 150px; /* Set the height */
    border-radius: 50%; /* Make the image round */
    object-fit: cover; /* Maintain aspect ratio */
  }
section.setup h5 {
    font-weight:700;
    font-size:10px;
    line-height:24px;
    color:#010101;
    padding-bottom:18px;
}
section.setup .desc p{
    font-weight: 400;
    font-size: 13px;
    line-height:22px;
    color: #010101;
    max-width:284px;
    margin: 0 auto;
}
section.information .text.information{
    padding:50px 0;

}
section.information h5{
    font-size:42px;
    font-weight:700;
    line-height:48px;
    color: #010101;
}
section.information p{
    font-size:18px;
    font-weight:300;
    line-height:28px;
    color: #010101;
    padding-top:20px;
}
section.information .info-1{
    padding:183px 0;

}

section.information .info-1 img,
section.information .info-2 img {
    width: 200px; /* Set the width to make the images larger */
    height: 200px; /* Set the height */
    border-radius: 12px; /* Adjust the border-radius for a less rounded appearance */
    object-fit: cover; /* Maintain aspect ratio */
    position: relative; /* Set the position to relative */
    z-index: 2; /* Ensure the images appear above other elements */
    margin-top: -50px; /* Adjust the margin-top to overlap the text */
}


footer {
    padding-top: 279px;
    margin-bottom:44px;

}
footer a{
    font-weight:bold;
    font-size:14px;
    color:#010101;
    line-height: 18px;
}
footer .copy {
    margin-top: 32px;
    font-size:14px;
    color:#d3d3d3;
    line-height:17px;
    font-weight:400;
}
/* responsiveness */
@media (max-width:576px){
    section .hero,
    section.setup,
    section.information {
        text-align:center;
    }
    .navbar {
    padding: 10px 0;
  }

  .navbar-brand {
    font-size: 20px; /* Adjust font size */
  }

  .nav-link {
    font-size: 14px; /* Adjust font size */
  }
   
    section.hero img {
        padding-top:2.5rem;

    }

    section.hero .text {
        font-weight:800;
        font-size:38px;
        line-height:53px;
    }
   
    .buttons .btn{
        display:block;
        margin: 1rem 0;
    }
    .buttons .ms-3{
        margin-left:0 !important;

    }
    section.setup{
        padding: 50px 0;

    }
    footer {
        padding-top: 50px;
        margin-bottom: 44px;
    }

}

</style>