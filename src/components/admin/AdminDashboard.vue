<template>
  <div>
    <header>
      <!-- Your header content here -->
    </header>
    <main>
      <section id="home-section">
        <div class="container-fluid px-5 py-5">
          <div class="heading-box d-flex align-items-center justify-content-start mb-5">
            <ion-icon class="fs-1" name="apps-outline"></ion-icon>
            <h1 class="m-0 ps-3">Admin Dashboard</h1>
          </div>
          <div class="row row-cols-1 row-cols-md-2 g-4">
            <div class="col">
              <div class="card h-100 shadow border-0 border-top border-5 border-danger">
                <div class="card-body">
                  <div class="holder d-flex align-items-center justify-content-between mb-5 pt-1">
                    <div>
                      <ion-icon name="people-outline"></ion-icon>
                      <h3 class="card-title">All Users</h3>
                    </div>
                  </div>
                  <div class="box bg-light border-top border-2 border-secondary">
                    <router-link class="nav-link text-danger py-3 px-1 fs-5" to="/admin/all/users">
                      View All &rarr;
                    </router-link>
                  </div>
                </div>
              </div>
            </div>
            <div class="col">
              <div class="card h-100 shadow border-0 border-top border-5 border-warning">
                <div class="card-body">
                  <div class="holder d-flex align-items-center justify-content-between mb-5 pt-1">
                    <div>
                      <ion-icon name="close-outline"></ion-icon>
                      <h3 class="card-title">Recent Posts</h3>
                    </div>
                  </div>
                  <div class="box bg-light border-top border-2 border-secondary">
                    <router-link class="nav-link text-warning py-3 px-1 fs-5" to="/admin/all/posts">
                      View All &rarr;
                    </router-link>
                  </div>
                </div>
              </div>
            </div>
            <!-- Additional sections for Accepted Cows and Certified Cows -->
            <div class="col">
              <div class="card h-100 shadow border-0 border-top border-5 border-success">
                <div class="card-body">
                  <div class="holder d-flex align-items-center justify-content-between mb-5 pt-1">
                    <div>
                      <ion-icon name="checkmark-outline"></ion-icon>
                      <h3 class="card-title">Certified</h3>
                    </div>
                  </div>
                  <div class="box bg-light border-top border-2 border-secondary">
                    <router-link class="nav-link text-success py-3 px-1 fs-5" to="/admin/certified/cows">
                      View All &rarr;
                    </router-link>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
// You can add your logic here if needed
export default {
  // Component details
};
</script>

<style>
/* Your styles here */
</style>
