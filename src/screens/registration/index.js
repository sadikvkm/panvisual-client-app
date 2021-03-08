const { ipcRenderer } = require("electron");

(function(){

    let submitButton = document.getElementById('submit-button');
    let input = document.getElementById('product-input');
    let error = document.getElementById('error-input');
    let closeButton = document.getElementById('close-application');

    submitButton.addEventListener("click", function() {

        if(input.value) {

            submitButton.innerText = "Please wait...";
            submitButton.disabled = true;
            ipcRenderer.send('register-application', input.value);
        }else {
            error.innerText = "The product key field is required."
        }
    });

    closeButton.addEventListener("click", function() {
        ipcRenderer.send('close-window');
    });

    ipcRenderer.on('error-product-activation', (e, d) => {
        submitButton.innerText = "Submit";
        submitButton.disabled = false;
        error.innerText = d
    })

})()


