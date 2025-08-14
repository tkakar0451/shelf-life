document.addEventListener('DOMContentLoaded', function () {
  const reviewModal = document.getElementById('reviewModal');
  reviewModal.addEventListener('show.bs.modal', function (ev) {
    const btn = ev.relatedTarget; // the Edit button
    // read data-* from the button
    const id      = btn.getAttribute('data-review-id');
    const text    = btn.getAttribute('data-review-text') || '';
    const rating  = btn.getAttribute('data-rating') || '';
    const spoiler = btn.getAttribute('data-spoiler') === '1';
    const title   = btn.getAttribute('data-title') || 'Edit review';

    // fill modal fields
    reviewModal.querySelector('#modal_reviewId').value   = id;
    reviewModal.querySelector('#updatedReview').value    = text;
    reviewModal.querySelector('#updatedRating').value    = rating;
    reviewModal.querySelector('#updatedSpoiler').checked = spoiler;

    // nice header
    reviewModal.querySelector('#reviewModalLabel').textContent = `Edit review — ${title}`;
  });
});