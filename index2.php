<html>
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <style>
    body {
       background-color: powderblue;
    }
    .title{
      font-family: 'Courier New';
      text-align: center;
      font-weight: bold;
      font-size: 50px;
    }
    .Login{
      font-family: 'Courier New';
      text-align: center;
      font-weight: bold;
      font-size: 25px;
    }
    form {
      border-radius: 5px;
      background-color: #f2f2f2;
      padding: 20px;
    }

    label {display: block;}

    input[type=email], input[type=password], input[type=cpassword], select {
      width: 100%;
      padding: 12px;
      margin: 8px 0;
      display: inline-block;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-sizing: border-box;
    }

    input[type=submit] {
      width: 25%;
      background-color: #4CAF50;
      color: white;
      padding: 8px;
      margin: 8px 0;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 30px;
    }

    input[type=submit]:hover {
      background-color: #45a049;
    }

    .error-message {
      color: red;
      font-family: Arial, sans-serif;
      font-size: 14px;
      margin-bottom: 10px;
      display: none;
    }

  .container {
  position: relative;
  }
  </style>

  <title>
    QueueSmart Registration Page
  </title>
  
  <link rel="stylesheet" href="index.css" />
</head>

<body>

<p class="title">Get Started With QueueSmart</p>

<p class="Login">&#8595 Enter Your Email, Your Password, and Confirm Your Password Below &#8595</p>

<form id="loginForm" action="index.php" method="post" onsubmit="return validateForm()">
  <div id="error-summary" class="error-message"></div>

  <label for="email">Email Address</label>
  <input type="email" id="email" name="email" placeholder="Enter your email address" required>

  <label for="password">Password</label>
  <input type="password" id="password" name="password" placeholder="Enter your password" minlength="8" required>

  <label for="cpassword">Confirm Password</label>
  <input type="cpassword" id="cpassword" name="cpassword" placeholder="Confirm your password" minlength="8" required>
  
  <input type="submit" value="Register">
</form>

<script>
function validateForm() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const cpassword = document.getElementById("cpassword").value;
  const errorElement = document.getElementById("error-summary");
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    errorElement.textContent = "Please enter a valid email address.";
    errorElement.style.display = "block";
    return false;
  }
  
  if (password.length < 8) {
    errorElement.textContent = "Password must be at least 8 characters long.";
    errorElement.style.display = "block";
    return false;
  }

   if (cpassword != password) {
    errorElement.textContent = "Passwords don't match.";
    errorElement.style.display = "block";
    return false;
  }
  errorElement.style.display = "none";
  return true;
}
</script>

</body>
</html>