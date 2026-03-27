(function(){
    const MAX_LOGIN_ATTEMPTS = 3;
    const LOCKOUT_SECONDS    = 20;
    let _loginAttempts   = 0;
    let _loginLockoutUntil = null;

    function setLoginError(msg) {
        const el = document.getElementById('loginError');
        if (!el) { if (msg) notify(msg, 'error'); return; }
        if (!msg) { el.style.display = 'none'; el.textContent = ''; }
        else      { el.style.display = 'block'; el.textContent = msg; }
    }

    function disableLoginControls(disabled) {
        const form = document.getElementById('loginForm');
        if (!form) return;
        Array.from(form.querySelectorAll('input, button')).forEach(el => { el.disabled = disabled; });
    }

    function togglePasswordVisibility() {
        const pwd  = document.getElementById('loginPassword');
        const icon = document.getElementById('passwordToggleIcon');
        if (!pwd || !icon) return;
        if (pwd.type === 'password') {
            pwd.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            pwd.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
        pwd.focus();
    }

    function autofillDemo() {
        const u = document.getElementById('loginUsername');
        const p = document.getElementById('loginPassword');
        if (!u || !p) return;
        u.value = 'admin';
        p.value = 'admin123';
        const r = document.getElementById('rememberMe');
        if (r) r.checked = true;
        setLoginError('Demo credentials filled — click Sign In.');
    }

    function initLoginForm() {
        const saved = localStorage.getItem('bvs_username');
        const u = document.getElementById('loginUsername');
        const r = document.getElementById('rememberMe');
        if (u && saved) {
            u.value = saved;
            if (r) r.checked = true;
            setTimeout(() => document.getElementById('loginPassword')?.focus(), 100);
        } else {
            u?.focus();
        }
        setLoginError('');
    }

    // Override handleLogin to use the server session API
    async function handleLogin(e) {
        e.preventDefault();

        const now = Date.now();
        if (_loginLockoutUntil && now < _loginLockoutUntil) {
            const sec = Math.ceil((_loginLockoutUntil - now) / 1000);
            setLoginError(`Too many attempts. Try again in ${sec}s.`);
            notify('Too many login attempts. Please wait.', 'error');
            return;
        }

        const username = document.getElementById('loginUsername')?.value?.trim();
        const password = document.getElementById('loginPassword')?.value;

        if (!username || !password) {
            setLoginError('Username and password are required.');
            notify('Please enter username and password.', 'error');
            return;
        }

        const spinner = document.getElementById('loginSpinner');
        if (spinner) spinner.style.display = 'inline-block';
        disableLoginControls(true);

        try {
            const res = await fetch('/Home/Login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                if (document.getElementById('rememberMe')?.checked) {
                    localStorage.setItem('bvs_username', username);
                } else {
                    localStorage.removeItem('bvs_username');
                }

                _loginAttempts     = 0;
                _loginLockoutUntil = null;
                setLoginError('');

                // Use site.js showAppAfterLogin
                if (typeof showAppAfterLogin === 'function') {
                    showAppAfterLogin();
                }
                notify(`Welcome back, ${username}!`);
            } else {
                _loginAttempts++;
                const data = await res.json().catch(() => ({}));
                const msg  = data.message || 'Invalid username or password.';
                setLoginError(msg);
                notify(msg, 'error');

                if (_loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                    _loginLockoutUntil = Date.now() + LOCKOUT_SECONDS * 1000;
                    setLoginError(`Too many failed attempts. Try again in ${LOCKOUT_SECONDS}s.`);
                    disableLoginControls(true); // keep disabled during lockout
                    setTimeout(() => {
                        _loginAttempts     = 0;
                        _loginLockoutUntil = null;
                        setLoginError('');
                        disableLoginControls(false);
                    }, LOCKOUT_SECONDS * 1000);
                }
            }
        } catch {
            setLoginError('Connection error. Please try again.');
            notify('Connection error.', 'error');
        } finally {
            // Only re-enable controls if NOT in lockout
            if (!_loginLockoutUntil || Date.now() >= _loginLockoutUntil) {
                disableLoginControls(false);
            }
            if (spinner) spinner.style.display = 'none';
        }
    }

    window.togglePasswordVisibility = togglePasswordVisibility;
    window.autofillDemo   = autofillDemo;
    window.handleLogin    = handleLogin;
    window.initLoginForm  = initLoginForm;

    window.addEventListener('load', () => {
        try { initLoginForm(); } catch (e) {}
    });
})();
