const express = require('express')
const router = express.Router()
const moment = require('moment')
const bcrypt = require('bcrypt')
const path = require('path')
const joi = require('../middlewares/joi-mw')
const { isUser, isGuest } = require('../middlewares/auth-mw')
const passport = require('passport')
const { alert } = require('../modules/util')
const { pool } = require('../modules/mysql-conn')

const pug = { file: 'auth' }

router.get('/join', isGuest, (req, res, next) => {
	pug.title = '회원가입'
	res.render('auth/join', pug)
})

router.post('/save', isGuest, async (req, res, next) => {
	try {
		let { userid, userpw, userpwReview, email } = req.body
		let sql, connect, values
		sql = 'SELECT userid FROM users WHERE userid=?'
		values = [userid]
		connect = await pool.getConnection()
		const rs = await connect.query(sql, values)
		connect.release()
		if(userpw === userpwReview && userid && email) {
			if(rs[0][0]) res.send(alert('아이디를 사용할 수 없습니다.'))
			else {
				sql = 'INSERT INTO users SET userid=?, userpw=?, email=?'
				userpw = await bcrypt.hash(userpw, Number(process.env.BCRYPT_ROUND))
				values = [userid, userpw, email]
				connect = await pool.getConnection()
				await connect.query(sql, values)
				connect.release()
				res.send(alert('회원가입이 되었습니다.', '/auth/login'))
			}
		}
		else res.send(alert('입력정보가 확인되지 않았습니다.'))
	}
	catch(err) {
		console.log(err)
		next(err)
	}
})

router.get('/login', isGuest, (req, res, next) => {
	pug.title = '회원 로그인'
	res.render('auth/login', pug)
})


router.post('/logon', isGuest,  async (req, res, next) => {
	const done = (err, user, msg) => {
		if(err) return next(err)
		if(!user) return res.send(alert(msg, '/'))
		else {
			req.login(user, (err) => {
				if(err) return next(err)
				else {
					return res.send(alert('로그인 되었습니다.', '/'))
				}
			})
		}
	}
	// 라우터의 콜백 내 middleware 실행
	passport.authenticate('local', done)(req, res, next)
})

router.get('/logout', isUser, (req, res, next) => {
	req.logout()
	req.session.destroy()
	req.app.locals.user = null
	res.send(alert('로그아웃 되었습니다.', '/'))
})

router.get('/api/valid-userid', isGuest, async (req, res, next) => {
	try {
		let sql, values, connect
		sql = 'SELECT userid FROM users WHERE userid=?'
		values = [req.query.userid]
		connect = await pool.getConnection()
		const [rs] = await connect.query(sql, values)
		connect.release()
		if(rs[0]) res.json({ code: 201 })
		else res.json({ code: 200 })
	}
	catch(error) {
		res.json({ error })
	}
})

router.get('/kakao', passport.authenticate('kakao'))
router.get('/kakao/cb', passport.authenticate('kakao', {failureRedirect: '/'}), (req, res, next) => {
	res.redirect('/')
})


module.exports = router