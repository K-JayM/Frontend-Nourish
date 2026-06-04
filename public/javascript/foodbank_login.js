
const login = document.querySelector('#login_section');
const email = document.querySelector('#email')
const password = document.querySelector('#password')
login.addEventListener('submit', async function (event) {
    event.preventDefault();
    console.log(password.value, email.value)


})
