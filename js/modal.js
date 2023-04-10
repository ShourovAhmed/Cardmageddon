//LOGIN
var openLoginModal = document.getElementById("open-login-modal-btn");
var closeLoginModal = document.getElementById("exit-login-modal-btn");
var loginModal = document.getElementById("login-modal-back");

openLoginModal.onclick = function() {
  loginModal.style.display = "flex";
}
closeLoginModal.onclick = function() {
  loginModal.style.display = "none";
}
