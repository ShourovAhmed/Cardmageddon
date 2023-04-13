//costom terminal
var dbT = document.getElementById("dbT");

//GET LOGIN STATUS
let loginStatus = document.getElementById("loginStatus").getElementsByTagName("status")[0]
let logBtnText = document.getElementById("loginStatus");

//SET Login Status
const setLoginStatus = () => {

    modalBack.style.display = "none";
    logBtnText.textContent = "Afmelden";
    loginStatus.textContent = "1";
    loginM.style.display = "none";
}



//GET MODAL BACK
const modalBack = document.getElementById("modals");

//GET THE MODALSFRONTS AND ATTRIBUTES
const loginM = document.getElementById("loginM");
const logoutM = document.getElementById("logoutM");
const cardM = document.getElementById("cardM");
const errorM = document.getElementById("errorM");
let errorMess = document.getElementById("errorMess");

//SHOWING A MODAL BACK
const openModalBtns = document.getElementsByClassName("showM");


for (let i = 0; i < openModalBtns.length; i++){
    let openModalBtn = openModalBtns[i].
    addEventListener('click', function(event) {
        //modal background openen
        modalBack.style.display = "block";

        //De gewenste modal is moet als klasse meegegeven worden in de oproep knop.
        let eventClasses = event.target.classList;

        if (eventClasses.contains("logM")){ //log in out modal 

            if(loginStatus.textContent != "1"){
                logoutM.style.display = "flex";
            }
            else{
                loginM.style.display = "flex";
            }
        } 

        else if (eventClasses.contains("cardM")){
            cardM.style.display = "flex";
        }

        else if (eventClasses.contains("errorM")){
            errorMess.textContent = event.target.getElementsByTagName("status")[0].textContent;
            errorM.style.display = "flex";
        }
        else{
            errorMess.textContent = "Fout opgetreden. Contacteer support als dit zich blijft voordoen."
            errorM.style.display = "flex";
        }
    })
};


//CLOSING THE MODAL
const closeModalBtns = document.getElementsByClassName("hideM");

// To Close the current modal, by pressing its exit-modal-btn
for (let i = 0; i < closeModalBtns.length; i++){
    let closeModalBtn = closeModalBtns[i].
    addEventListener('click', function(event) {
        event.target.parentElement.style.display = "none";
        modalBack.style.display = "none";
        })
    };


