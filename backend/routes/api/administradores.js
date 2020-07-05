const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { ensureAuthenticated } = require('../../config/auth');

const Administrador = require('../../models/Administrador');

// Get lista de administradores
router.get('/', ensureAuthenticated, (req, res) =>
  Administrador.findAll({ order: [['createdAt', 'DESC']] })
    .then(admins => res.json(admins))
    .catch(err => console.log(err))
);

// Edit a administrador
router.put('/:adminId', ensureAuthenticated, async (req, res) => {
  const { adminId } = req.params;
  const { nome, email, contato, senha } = req.body;
  let errors = [];

  if (!adminId) {
    errors.push({ message: 'Informe o id de um administrador.' });
  }

  const adminInformado = await Administrador.findOne({
    where: { id: adminId },
  });

  if (!adminInformado) {
    errors.push({ message: 'O administrador informado não existe.' });
  }

  if (errors.length > 0) {
    return res.status(400).json(errors);
  }

  const updates = {
    nome: nome || adminInformado.nome,
    contato: contato || adminInformado.contato,
    email: email || adminInformado.email,
  };

  // Hash password
  if (senha) {
    bcrypt.genSalt(10, (err, salt) =>
      bcrypt.hash(senha, salt, (err, hash) => {
        if (err) throw err;

        // Create new admin
        Administrador.update(
          {
            ...updates,
            senha: hash, // Set pasword to hashed
          },
          { where: { id: adminId } }
        )
          .then(() => res.sendStatus(204))
          .catch(err => {
            console.log(err);
            return res.sendStatus(500);
          });
      })
    );
  } else {
    await Administrador.update({ ...updates }, { where: { id: adminId } });
    res.sendStatus(204);
  }
});

// Delete a administrador
router.delete('/:adminId', ensureAuthenticated, async (req, res) => {
  const { adminId } = req.params;
  let errors = [];

  if (!adminId) {
    errors.push({ message: 'Informe o id de um administrador.' });
  }

  const adminInformado = await Administrador.findOne({
    where: { id: adminId },
  });

  if (!adminInformado) {
    errors.push({ message: 'O administrador informado não existe.' });
  }

  if (errors.length > 0) {
    return res.status(400).json(errors);
  }

  const deleteAdmin = await Administrador.destroy({
    where: {
      id: adminId,
    },
  });

  if (!deleteAdmin) {
    errors.push({ message: 'Erro ao excluir membro.' });
    return res.status(500).json(errors);
  }

  return res.sendStatus(204);
});

// Register an admin
router.post('/register', (req, res) => {
  let { nome, email, senha, contato } = req.body;
  let errors = [];

  // Check required fields
  if (!nome || !email || !senha || !contato) {
    errors.push({ message: 'Informe todos os dados' });
  }

  // Check length password
  if (senha && senha.length < 6) {
    errors.push({ message: 'A senha precisa ter ao menos 6 caracteres' });
  }

  if (errors.length > 0) {
    res.status(400).json({ errors });
  } else {
    // Validation passed
    Administrador.findOne({ where: { email: email } })
      .then(admin => {
        if (admin) {
          // Admin exists
          errors.push({ message: 'E-mail já foi usado' });
          res.status(400).json({ errors });
        } else {
          // Hash password
          bcrypt.genSalt(10, (err, salt) =>
            bcrypt.hash(senha, salt, (err, hash) => {
              if (err) throw err;

              // Create new admin
              Administrador.create({
                nome,
                email,
                senha: hash, // Set pasword to hashed
                contato,
              })
                .then(admin => res.status(200).json(admin))
                .catch(err => {
                  console.log(err);
                  return res.sendStatus(500);
                });
            })
          );
        }
      })
      .catch(err => {
        console.log(err);
        return res.sendStatus(500);
      });
  }
});

// Login Handle
router.post('/login', function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(400).json(info);
    }

    req.logIn(user, function (err) {
      if (err) {
        return next(err);
      }
      return res.json({ message: 'Logged In Succesfully', user });
    });
  })(req, res, next);
});

// Logout Handle
router.get('/logout', (req, res) => {
  req.logout();
  res.json({ message: 'Logged Out Succesfully' });
});

module.exports = router;
