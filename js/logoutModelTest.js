//OPENING LOGOUT MODAL
var openLogoutModal = document.getElementById("open-logout-modal-btn");
var logoutModal = document.getElementById("logout-modal-back");

openLogoutModal.onclick = function() {
  logoutModal.style.display = "flex";
}


//CLOSING THE MODAL
const closeModalBtns = document.getElementsByClassName("exit-modal-btn");
const modalBacks = document.getElementsByClassName("modal-back");

// To Close the current modal, by pressing its exit-modal-btn
for (let i = 0; i < closeModalBtns.length; i++){
    let closeModalBtn = closeModalBtns[i].
    addEventListener('click', function(event) {
        event.target.parentElement.parentElement.style.display = "none"
        })
    };