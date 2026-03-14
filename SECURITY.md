# Security Policy

## 🔒 Supported Versions

This project is a static web application hosted on GitHub Pages. Security updates are applied to the latest version only.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| Older   | :x:                |

## 🛡️ Security Considerations

### Client-Side Application

ADC Threat Analyzer is a **client-side only application** with:
- No backend server
- No user authentication
- No personal data collection
- No database connections
- No API keys exposed to users

### Data Sources

The application uses publicly available data from:
- **Riot Games DDragon API** (public, read-only)
- **GitHub Pages** (static hosting)
- **CDN resources** (fonts, icons)

### Third-Party Dependencies

Production dependencies: **None** (vanilla JavaScript)

Development dependencies (for automation only):
- `axios` (HTTP client for Node.js scripts)

## 🐛 Reporting a Vulnerability

If you discover a security vulnerability, please follow these steps:

### 1. DO NOT Create a Public Issue

Security vulnerabilities should be reported privately to avoid exploitation.

### 2. Report Via Private Channels

**Preferred Methods:**
- Email: Create a throwaway email and contact via GitHub profile
- GitHub Security Advisory: Use the "Security" tab → "Report a vulnerability"
- Twitter DM: [@BritMendieta](https://twitter.com/BritMendieta)

### 3. Include These Details

- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Impact** assessment (who/what is affected)
- **Potential fix** (if you have suggestions)
- **Your contact information** (for follow-up)

### 4. Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 7 days
  - Medium: 14 days
  - Low: 30 days

## 🔐 Security Best Practices

This project follows these security practices:

### Code Security
- ✅ No `eval()` or dynamic code execution
- ✅ Input sanitization for user inputs
- ✅ No inline event handlers
- ✅ Content Security Policy headers (via GitHub Pages)
- ✅ HTTPS only (enforced by GitHub Pages)

### Dependency Security
- ✅ Minimal dependencies (production: zero)
- ✅ Regular dependency updates via Dependabot
- ✅ No outdated or vulnerable packages
- ✅ GitHub Actions security scanning

### Data Privacy
- ✅ No cookies
- ✅ No tracking scripts
- ✅ No personal data collection
- ✅ No third-party analytics
- ✅ No server-side processing

## 🚨 Known Security Considerations

### External API Usage

The application fetches champion icons from Riot's CDN:
```
https://ddragon.leagueoflegends.com/cdn/[version]/img/champion/[name].png
```

**Mitigation:**
- Images are loaded from Riot's official CDN only
- No user-controlled URLs
- Subresource Integrity (SRI) not applicable for dynamic images

### Local Storage

The application may use browser LocalStorage for:
- PWA caching
- User preferences (if implemented)

**Security:**
- No sensitive data stored
- Data never transmitted to servers
- Cleared when user clears browser data

## 🔄 Automated Security

### GitHub Actions

The auto-update workflow has these security measures:
- ✅ Read-only access to Riot API (no authentication required)
- ✅ Commits signed with GitHub token
- ✅ No secrets in code or commits
- ✅ Workflow runs in isolated environment

### Dependabot

Enabled for:
- Security updates
- Version updates
- Automated pull requests

## 📋 Security Checklist for Contributors

Before submitting a PR, ensure:
- [ ] No API keys or secrets in code
- [ ] No `eval()` or `Function()` constructors
- [ ] User inputs are sanitized
- [ ] External resources use HTTPS
- [ ] No inline JavaScript in HTML
- [ ] Dependencies are up to date
- [ ] No console.log() with sensitive data

## 🌐 Bug Bounty

This is a personal open-source project with no bug bounty program. However:
- Security researchers are acknowledged in releases
- Contributions are credited in CHANGELOG
- Gratitude and recognition for responsible disclosure

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

## 📞 Contact

**Maintainer:** Samuel Mendieta
**GitHub:** [@SamTesura](https://github.com/SamTesura)
**Website:** [samuelmendieta.com](https://samuelmendieta.com/)
**Twitter:** [@BritMendieta](https://twitter.com/BritMendieta)

---

**Last Updated:** March 2026
**Version:** 1.0.0
