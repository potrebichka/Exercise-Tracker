const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', {useNewUrlParser: true})
    .then(res => console.log("Connected to DB"))
    .catch(err => console.error(err));

//Create models
var exerciseSchema = new mongoose.Schema({
  userId: {
    type: String,
    minlegth: 1,
    required: true
  },
  description: {
    type: String,
    minlength: 1,
    required: true
  },
  duration: {
    type: Number,
    minlength: 1,
    required: true
  },
  date: {
    type: Date
  }
});

var userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  exercises: [exerciseSchema]
});

var NewExercise = mongoose.model('NewExercise', exerciseSchema);
var NewUser = mongoose.model('NewUser', userSchema);


app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//post new user
app.post("/api/exercise/new-user", function(req, res) {
  var user = new NewUser(req.body);
  user.save((err) => err ? res.json({"error" : "User not saved. Choose other username."}) : res.json({'username': user.username, '_id': user._id}));
});

//get arrays of users
app.get("/api/exercise/users", function(req, res) {
  NewUser.find({}, function(err, users) {
    if (err) {
     res.json({"error" : "Can't get list of users"})
    } else {
      var userMap = [];

      users.forEach(function(user) {
        userMap.push({'username': user.username, "id": user._id})
      });

      res.send(userMap);  
    }
  });
});

//add exercises to user
app.post("/api/exercise/add", function(req, res) {
  console.log(req.body);
  
  NewUser.findById(req.body.userId, (err, data) => {
    if (err) {
      console.error(err);
      res.json({"error" : "Problems with finding user"})
    } else {
      let userDate = req.body.date === "" ? new Date() : req.body.date;
      console.log(userDate);
      NewExercise.create({
        userId: data._id,
        description: req.body.description,
        duration: req.body.duration,
        date: userDate
      }, function (err, insideData) {
           if (err) {
             res.json({"error": "Not Saved. Invalid Data"})
           }
           else {
             data.exercises.push(insideData);
             data.save();
             res.json(insideData)
           }
       });
     }
      
      //res.json(data)
  });
  //res.json({"doing": "doing"})
})

app.get("/api/exercise/log?:userId", function(req,res) {
  
  if (!req.query.userId) {
    res.json({"error": "Wrong query"})
  }
  NewUser.findById(req.query.userId, (err, data) => {
    if (err) {
      res.json({"error":"Unknown User"})
    } else {
      if (req.query.from) {
        const newDate = new Date(req.query.from) ;
        if (newDate instanceof Date && !isNaN(newDate)) {
          data.exercises = data.exercises.filter(element => element.date >= newDate)
        }
      }
      if (req.query.to) {
        const newDate = new Date(req.query.to) ;
        if (newDate instanceof Date && !isNaN(newDate)) {
          data.exercises = data.exercises.filter(element => element.date <= newDate)
        }
      }
      if (req.query.limit) {
         const newLimit = Number(req.query.limit);
        if (!isNaN(newLimit)) {
          data.exercises = data.exercises.slice(0, newLimit)
        }
      } 
      res.json(data)
    }
  });
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

