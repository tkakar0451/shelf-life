/*
  File: public/search.js
  Author: Yusra Ashar
  Description: Handles Google Books API fetch and renders themed book cards.
*/

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("searchForm");
  const input = document.getElementById("searchInput");
  const resultsContainer = document.getElementById("results");

  // Listen for form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent page reload

    const query = input.value.trim();
    if (!query) return; // Exit if input is empty

    resultsContainer.innerHTML = ""; // Clear old results

    try {
      // Fetch books from Google Books API
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${query}`);
      const data = await response.json();

      // Handle no results
      if (!data.items || data.items.length === 0) {
        resultsContainer.innerHTML = "<p style='text-align:center;'>No books found.</p>";
        return;
      }

      // Render each book card
      data.items.forEach(book => {
        const info = book.volumeInfo;

        const title = info.title || "Untitled";
        const authors = info.authors?.join(", ") || "Unknown Author";
        const id = book.id;
        const thumbnail =
          info.imageLinks?.thumbnail ||
          info.imageLinks?.smallThumbnail ||
          "/images/default-book.png";
        // rating system
        let starRating = generateStarRating(info.averageRating);

        // Create card element
        const card = document.createElement("div");
        card.className = "card";

        // Populate card with book data
        card.innerHTML = `
          <img src="${thumbnail}" alt="${title}">
          <div class="card-title">${title}</div>
          <div class="card-author">${authors}</div>
          <div class="star-rating">${starRating}</div>
          <a href="/books/${id}" class="btn">View Details</a>
        `;

        // Append card to results container
        resultsContainer.appendChild(card);
      });

    } catch (err) {
      // Handle fetch errors
      resultsContainer.innerHTML = "<p style='color:red; text-align:center;'>Error fetching results.</p>";
      console.error("Search failed:", err);
    }
  });
});

// dynamic star rating system instead of placeholder
function generateStarRating(rating) {
    let stars = '';
    // round to the nearest half
    const roundedRating = Math.round(rating * 2) / 2;

    switch (roundedRating) {
        case 0:   stars = '☆☆☆☆☆'; break;
        case 0.5: stars = '½☆☆☆☆'; break;
        case 1:   stars = '★☆☆☆☆'; break;
        case 1.5: stars = '★½☆☆☆'; break;
        case 2:   stars = '★★☆☆☆'; break;
        case 2.5: stars = '★★½☆☆'; break;
        case 3:   stars = '★★★☆☆'; break;
        case 3.5: stars = '★★★½☆'; break;
        case 4:   stars = '★★★★☆'; break;
        case 4.5: stars = '★★★★½'; break;
        case 5:   stars = '★★★★★'; break;
        default:  stars = '☆☆☆☆☆'; // Default if there are no reviews
    }
    return stars;
}