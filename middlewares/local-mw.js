module.exports = () => {
	return (req, res, next) => {
		req.app.locals.user = req.user ? req.user : null
		next()
	}
}