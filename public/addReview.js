/**
 * Back-end file to handle the display of "Add Review" Modal Popup Window
 * and the Review Submission
 */

// Event listeners

let addReviewLinks = document.querySelectorAll(".addNewReview");
for(button of addReviewLinks){
    button.addEventListener("click", addReviewWindow);
}

async function addReviewWindow(){
    var myModal = new bootstrap.Modal(document.getElementById('authorModal'));
    myModal.show();
}