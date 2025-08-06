// Waits for the form to be submitted
document.getElementById("searchForm").addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevents page refresh
  
    // Get user input from the search bar
    const query = document.getElementById("searchInput").value;
  
    // Call Google Books API with the search query
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}`);
    const data = await res.json();
  
    // Get the div where results will appear
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = ""; // Clear old results
  
    // Loop through each book in the API response
    data.items.forEach(book => {
      const info = book.volumeInfo; // Shorten reference
      const bookId = book.id;       // Use this for detail page link
  
      // Append a new Bootstrap card for each book
      resultsDiv.innerHTML += `
        <div class="col-md-4">
          <div class="card mb-4 shadow-sm">
          
            <!-- Show book cover or fallback -->
            <img src="${info.imageLinks?.thumbnail || ''}" class="card-img-top" alt="${info.title}">
  
            <div class="card-body">
              <h5 class="card-title">${info.title}</h5>
              <p class="card-text">${info.authors?.join(', ') || 'Unknown Author'}</p>
  
              <!-- Link to book details page (dynamic route) -->
              <a href="/books/${bookId}" class="btn btn-outline-primary">View Details</a>
            </div>
          </div>
        </div>`;
    });
  });