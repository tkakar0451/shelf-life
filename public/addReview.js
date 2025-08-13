/**
 * Back-end file to handle the display of "Add Review" Modal Popup Window
 * and the Review Submission
 */

// Event listeners

let addReviewLinks = document.querySelectorAll("#addNewReview");
let closeButton = document.querySelector('.btn-close').addEventListener("click", cleanUpModal);
for(button of addReviewLinks){
    button.addEventListener("click", addReviewWindow);
}

async function addReviewWindow(){
    var myModal = new bootstrap.Modal(document.getElementById('addReviewModal'));
    myModal.show();

    let title = document.getElementById('book-title').textContent;

    document.getElementById('modalTitle').textContent = `${title}`;
    document.getElementById('hiddenBookTitle').value = `${title}`;
}

function checkReview(){
    
}

function cleanUpModal(){
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style = ''; // clear any leftover inline styles
}