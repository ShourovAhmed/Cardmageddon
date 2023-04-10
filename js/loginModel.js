var loginModal = document.getElementById("login-modal-back");
var loginOnBtn = document.getElementById("open-login-modal-btn");
var logoutOnBtn = document.getElementById("")
var offBtn = document.getElementById("exit-modal-btn");


loginOnBtn.onclick = function() {
  loginModal.style.display = "flex";
}
offBtn.onclick = function() {
    loginModal.style.display = "none";
  }