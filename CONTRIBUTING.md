# Contributing to ADC Threat Analyzer

Thank you for your interest in contributing to ADC Threat Analyzer! This document provides guidelines for contributing to the project.

## 🎯 Project Overview

ADC Threat Analyzer is a personal portfolio project designed to help League of Legends ADC players analyze matchups with Challenger-level insights. While this is primarily a personal project, community contributions are welcome!

## 🤝 How to Contribute

### Reporting Bugs

If you find a bug, please create an issue on GitHub with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots (if applicable)
- Your browser and OS version

### Suggesting Enhancements

Enhancement suggestions are welcome! Please create an issue with:
- A clear description of the feature
- Why this feature would be useful
- Any implementation ideas you have

### Champion Data Updates

If you notice incorrect champion data:
1. Check if it's a known issue in the Issues tab
2. Create a new issue with:
   - Champion name
   - Incorrect data
   - Correct data (with source from League Wiki if possible)
   - Which ability is affected

### Strategic Tips Contributions

Have Challenger-level insights to share?
1. Create an issue or pull request with:
   - Champion matchup
   - Strategic tip or synergy advice
   - Your rank/credentials (optional but appreciated)
   - Source or reasoning

## 🔧 Pull Request Process

1. **Fork the Repository**
   - Navigate to the repository on GitHub
   - Click the "Fork" button to create a copy in your account

1. **Clone Your Fork Locally**

   Using HTTPS:
   ```bash
   git clone https://github.com/<your-username>/samtesura.github.io.git
   cd samtesura.github.io
   ```

   Or using SSH (if you have SSH keys configured):
   ```bash
   git clone git@github.com:<your-username>/samtesura.github.io.git
   cd samtesura.github.io
   ```
1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

1. **Make Your Changes**
   - Follow the existing code style
   - Test your changes locally
   - Ensure no console errors

1. **Commit Your Changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```

   Use conventional commit messages:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `style:` for formatting changes
   - `refactor:` for code refactoring
   - `test:` for adding tests
   - `chore:` for maintenance tasks

1. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

1. **Submit a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Include screenshots for UI changes

## 📝 Code Style Guidelines

### JavaScript
- Use vanilla JavaScript (no frameworks)
- Use `const` and `let` instead of `var`
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### CSS
- Follow the existing naming conventions
- Use CSS custom properties for colors
- Maintain the 8-point spacing grid
- Ensure responsive design (mobile-first)

### File Structure
- Keep related code together
- Don't create unnecessary files
- Update relevant documentation

## 🎨 Design Guidelines

- Maintain the League of Legends dark theme aesthetic
- Use the existing color palette (#01050d, #c89b3c)
- Ensure WCAG AA accessibility standards
- Keep UI consistent with existing design
- Optimize for performance (no heavy dependencies)

## 🧪 Testing

Before submitting a PR:
1. Test on multiple browsers (Chrome, Firefox, Safari)
2. Test on mobile devices
3. Check console for errors
4. Verify all links work
5. Test with different champion selections

## 📚 Data Sources

When updating champion data, use these official sources:
- **Cooldowns**: [Riot DDragon API](https://ddragon.leagueoflegends.com/)
- **Mechanics**: [League of Legends Wiki](https://leagueoflegends.fandom.com/)
- **CC Types**: [Crowd Control Documentation](https://leagueoflegends.fandom.com/wiki/Crowd_control)

## ⚠️ What NOT to Change

Please don't modify without discussion:
- The auto-update automation system
- Core application architecture
- Build/deployment process
- The vanilla JavaScript approach (no framework dependencies)

## 🔒 Security

If you discover a security vulnerability:
- **DO NOT** create a public issue
- Email the maintainer or create a private security advisory
- See [SECURITY.md](SECURITY.md) for details

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 💬 Questions?

If you have questions about contributing:
- Check existing issues and pull requests
- Create a new issue with the `question` label
- Reach out to [@SamTesura](https://github.com/SamTesura)

## 🙏 Thank You!

Your contributions help make ADC Threat Analyzer better for the League of Legends community!

---

**Author:** [Samuel Mendieta](https://samuelmendieta.com/)
**Website:** [adcthreat.gamer.gd](https://adcthreat.gamer.gd)
