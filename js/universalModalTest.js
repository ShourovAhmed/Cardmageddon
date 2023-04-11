//CLOSING THE MODAL
const closeModalBtns = document.getElementsByClassName("exit-modal-btn");
const modalBacks = document.getElementsByClassName("modal-back");

// To Close the current modal, by pressing its exit-modal-btn
for (let i = 0; i < closeModalBtns.length; i++){
    let closeModalBtn = closeModalBtns[i].
    addEventListener('click', function(event) {
        event.target.parentElement.parentElement.style.display = "none"
        });
    };



//OPENING A MODAL


