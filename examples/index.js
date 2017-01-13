const express = require('express')

const TOOLKIT_JS_PATH = process.env.TOOLKIT_JS_PATH || 'http://localhost:8342'

const app = new express()
app.set('port', (process.env.PORT || 8283))
app.set('view engine', 'ejs')
app.use(express.static(__dirname))

app.get('/binaural', (req, res) => {
  res.render('binaural', { TOOLKIT_JS_PATH })
})

app.get('/has', (req, res) => {
  res.render('has', { TOOLKIT_JS_PATH })
})

app.get('/hls', (req, res) => {
  res.render('hls', { TOOLKIT_JS_PATH })
})

app.get('/', (req, res) => {
  res.render('index', { TOOLKIT_JS_PATH })
})

app.listen(app.get('port'), function(error) {
  if (error) {
    console.error(error)
  } else {
    console.log("App running at port %s", app.get('port'))
  }
})
