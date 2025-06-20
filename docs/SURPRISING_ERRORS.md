# Surprising Errors Encountered

**Purpose:** This file documents unexpected errors, issues, and surprising behaviors encountered during development to serve as a reference for avoiding similar problems in future implementations.

---

## Rich Text Editor Implementation (2024-06-20)

### 1. **TipTap Font Size Extension Version Compatibility**

**Error:** 
```
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
npm error Found: @tiptap/pm@2.14.1
npm error Could not resolve dependency:
npm error peer @tiptap/pm@"^3.0.0-next.1" from @tiptap/core@3.0.0-next.8
```

**Root Cause:** 
- `@tiptap/extension-font-size` only available for TipTap v3
- Project was using TipTap v2.14.1
- Version mismatch between core packages

**Solution:** 
- Created custom FontSize extension using TextStyle extension
- Used `setMark('textStyle', { fontSize: value })` instead of non-existent `setFontSize` command

**Lesson:** Always check version compatibility before installing packages, especially for libraries with major version differences.

### 2. **TypeScript Command Interface Errors**

**Error:**
```
Type '{ setFontSize: (fontSize: string) => ({ commands }: { commands: any; }) => any; unsetFontSize: () => ({ commands }: { commands: any; }) => any; }' has no properties in common with type 'Partial<RawCommands>'.
Property 'setFontSize' does not exist on type 'ChainedCommands'.
```

**Root Cause:**
- Attempted to create custom commands in TipTap extension
- Incorrect command interface implementation
- TypeScript strict typing requirements

**Solution:**
- Removed custom FontSize extension
- Used existing TextStyle extension with `setMark` method
- Updated font size selector to use `editor.chain().focus().setMark('textStyle', { fontSize: value }).run()`

**Lesson:** TipTap v2 has strict typing requirements. Use existing extension methods rather than creating custom commands when possible.

### 3. **PowerShell Terminal Display Issues**

**Error:**
```
System.ArgumentOutOfRangeException: The value must be greater than or equal to zero and less than the console's buffer size in that dimension.
Parameter name: top
Actual value was 15.
```

**Root Cause:**
- PowerShell PSReadLine module display buffer issues
- Long npm install commands causing terminal rendering problems
- Windows-specific terminal behavior

**Solution:**
- Command completed successfully despite display errors
- No functional impact on installation
- Consider using shorter commands or different terminal in future

**Lesson:** Windows PowerShell can have display issues with long commands, but they often complete successfully despite visual errors.

### 4. **File Creation Permission Issues**

**Error:**
```
The apply model made no changes to the file joke.txt
```

**Root Cause:**
- Attempted to create new files using edit_file tool
- Tool may not create new files, only modify existing ones
- Permission or file system restrictions

**Solution:**
- Used terminal command `echo` to create files
- Alternative: Use `run_terminal_cmd` for file creation

**Lesson:** Different tools have different capabilities. Use appropriate tools for file creation vs. modification.

### 5. **TipTap Extension Import Issues**

**Error:**
```
npm error ETARGET
npm error notarget No matching version found for @tiptap/extension-font-size@2.14.1
```

**Root Cause:**
- Attempted to install specific version that doesn't exist
- Package only available in newer major versions
- Incorrect version specification

**Solution:**
- Checked available versions with `npm view @tiptap/extension-font-size versions --json`
- Confirmed only v3.0.0-next.3 available
- Implemented custom solution instead

**Lesson:** Always verify package availability and versions before attempting installation.

---

## General Development Insights

### **Version Management**
- **TipTap v2 vs v3:** Major breaking changes, different extension ecosystems
- **Package Compatibility:** Always check peer dependencies and version requirements
- **Migration Strategy:** Consider whether to upgrade or work within current version constraints

### **TypeScript Integration**
- **Strict Typing:** TipTap v2 has very strict TypeScript requirements
- **Extension Development:** Custom extensions require careful attention to type definitions
- **Command Interfaces:** Use existing extension methods rather than creating custom commands

### **Tool Limitations**
- **File Creation:** Some tools only modify existing files
- **Terminal Display:** Windows PowerShell can have rendering issues with long commands
- **Error Handling:** Visual errors may not indicate functional failures

### **Best Practices Discovered**
1. **Check package versions** before installation
2. **Use existing extension methods** when possible
3. **Implement custom solutions** for missing functionality
4. **Test functionality** despite visual errors
5. **Document version constraints** for future reference

---

## Prevention Strategies

### **Before Starting New Features**
1. Research package version compatibility
2. Check available extensions and their versions
3. Plan for custom implementations if needed
4. Consider upgrade paths and breaking changes

### **During Development**
1. Use TypeScript strict mode for better error detection
2. Test functionality even if visual errors occur
3. Document workarounds and custom solutions
4. Keep track of version-specific limitations

### **After Implementation**
1. Document version constraints and workarounds
2. Update documentation with lessons learned
3. Consider future upgrade paths
4. Share knowledge with team members

---

*Last Updated: 2024-06-20* 