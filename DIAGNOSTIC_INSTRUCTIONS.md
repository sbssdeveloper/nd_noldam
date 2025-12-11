# 🔍 BizTalk Diagnostic Tool - How to Use

## ✅ What I've Done

I've created a **comprehensive diagnostic tool** that automatically analyzes everything when you send a message. Here's what happens now:

### Automatic Diagnostics (After Every Message Send)

1. **Full Request Payload Logged** - Complete JSON sent to BizTalk
2. **Delivery Status Checked** - Automatically checks 3 seconds after sending
3. **Issue Detection** - Identifies common problems automatically
4. **Detailed Report** - Complete diagnostic report with recommendations

---

## 📋 How to Use

### Step 1: Send a Test Message

Send any message (OTP, meeting joined, signup complete):

```
- Join a meeting with payment
- Register a new user
- Send an OTP
```

### Step 2: Check Server Logs (After 3 Seconds)

Look for this in your server console:

```
================================================================================
🔍 BIZTALK DELIVERY DIAGNOSTIC REPORT
================================================================================
```

### Step 3: Read the Diagnostic Report

The report will show:

1. **📤 REQUEST PAYLOAD SENT TO BIZTALK**
   - Complete JSON payload
   - All parameters sent
   - Variables, buttons, etc.

2. **📋 TEMPLATE INFORMATION**
   - Template code used
   - Variables sent
   - Buttons sent (if any)

3. **📬 DELIVERY STATUS RESULT**
   - Status: SUCCESS, FAIL, or PENDING
   - Status code
   - Error messages (if any)
   - Delivery timestamps

4. **🔎 ISSUE ANALYSIS**
   - Detects common issues:
     - Template mismatch (error 1030)
     - Button configuration error (error 1031)
     - Missing required fields (error 1032)
   - Specific recommendations for each issue

5. **💡 RECOMMENDATIONS**
   - Step-by-step fixes
   - What to check in BizTalk console
   - What to send to BizTalk support

---

## 🎯 What to Look For

### ✅ Success Case

```
📬 DELIVERY STATUS RESULT:
- Status: SUCCESS
- Status Code: 2000
- Delivered At: 2025-01-21 10:30:05

🔎 ISSUE ANALYSIS:
✅ MESSAGE DELIVERED SUCCESSFULLY TO KAKAOTALK
```

### ❌ Failure Case

```
📬 DELIVERY STATUS RESULT:
- Status: FAIL
- Status Code: 1030
- Status Message: 템플릿 불일치

🔎 ISSUE ANALYSIS:
❌ MESSAGE NOT DELIVERED - DIAGNOSING ISSUE...
⚠️ ISSUE: Template mismatch or missing parameters
   - Check if template code matches exactly: club_joined-user
   - Verify all variables match template placeholders
   - Check if template requires buttons (currently sent: No)
```

---

## 🔧 Common Issues and Fixes

### Issue 1: Template Mismatch (Error 1030)

**Symptoms:**
- Status: FAIL
- Error Code: 1030
- Message mentions "템플릿" or "template"

**Fix:**
1. Check template code matches exactly
2. Verify all variable names match template placeholders
3. Check if template uses `<br>` or newlines (`\n`)
4. Ensure variable names are in Korean (e.g., `#{이름}` not `#{name}`)

### Issue 2: Missing Buttons (Error 1031)

**Symptoms:**
- Status: FAIL
- Error Code: 1031
- Message mentions "버튼" or "button"

**Fix:**
1. Check if template has buttons in BizTalk console
2. Add buttons to the request if required:
   ```typescript
   buttons: [
     {
       name: '모임 라운지',
       type: 'WL',
       linkMo: 'https://thenoldam.com/meeting/lounge',
       linkPc: 'https://thenoldam.com/meeting/lounge'
     }
   ]
   ```

### Issue 3: Missing Required Fields (Error 1032)

**Symptoms:**
- Status: FAIL
- Error Code: 1032
- Message mentions "필수" or "required"

**Fix:**
1. Check template in BizTalk console for all required fields
2. Compare request payload with template requirements
3. Add any missing fields

---

## 📧 What to Send to BizTalk Support

When messaging BizTalk support, include:

1. **Full Request Payload** (from logs):
   ```json
   {
     "msgIdx": "...",
     "tmpltCode": "club_joined-user",
     "recipient": "01059415282",
     "variables": {...},
     "message": "..."
   }
   ```

2. **Delivery Status Result** (from logs):
   ```json
   {
     "status": "FAIL",
     "statusCode": "1030",
     "statusMessage": "..."
   }
   ```

3. **Complete Diagnostic Report** (copy entire report from logs)

4. **Template Screenshot** from BizTalk console showing:
   - Template code
   - Template content
   - Variables/placeholders
   - Buttons (if any)

---

## 🚀 Next Steps

1. **Test Now**: Send a test message (join meeting, register user, etc.)
2. **Wait 3 Seconds**: Let the diagnostic run automatically
3. **Check Logs**: Look for the diagnostic report
4. **Analyze Results**: Check if status is SUCCESS or FAIL
5. **Fix Issues**: Follow the recommendations in the report
6. **Contact Support**: If still not working, send the diagnostic report to BizTalk

---

## 📝 Example Diagnostic Output

```
================================================================================
🔍 BIZTALK DELIVERY DIAGNOSTIC REPORT
================================================================================

📤 REQUEST PAYLOAD SENT TO BIZTALK:
{
  "msgIdx": "CLUB_JOINED_1763630911496_2324",
  "countryCode": "82",
  "resMethod": "PUSH",
  "senderKey": "...",
  "tmpltCode": "club_joined-user",
  "recipient": "01059415282",
  "variable": {
    "이름": "sailor",
    "모임명": "Test Meeting",
    "시간": "2025-01-21 15:13",
    "결제금액": "0",
    "결제수단": "무료"
  },
  "variables": {...},
  "message": "..."
}

📋 TEMPLATE INFORMATION:
- Template Code: club_joined-user
- Variables Sent: 이름, 모임명, 시간, 결제금액, 결제수단
- Buttons Sent: None

📬 DELIVERY STATUS RESULT:
- Status: FAIL
- Status Code: 1030
- Status Message: 템플릿 불일치

🔎 ISSUE ANALYSIS:
❌ MESSAGE NOT DELIVERED - DIAGNOSING ISSUE...
⚠️ ISSUE: Template mismatch or missing parameters
   - Check if template code matches exactly: club_joined-user
   - Verify all variables match template placeholders
   - Check if template requires buttons (currently sent: No)

📋 DIAGNOSTIC CHECKLIST:
□ Verify template code in BizTalk console matches: club_joined-user
□ Check if template has buttons (current status: No buttons)
□ Verify all variable names match template placeholders
□ Ensure message format matches template (newlines vs <br>)
□ Check if template requires additional fields

💡 RECOMMENDATIONS:
1. Check the template in BizTalk console for:
   - Exact template code
   - Required variables and their names
   - Button requirements (if any)
   - Message format (newlines or <br> tags)
2. Compare the request payload above with template requirements
3. If template has buttons but request doesn't, add buttons to the request
4. Verify variable names match exactly (Korean vs English, case-sensitive)
5. Send this diagnostic report to BizTalk support for review

================================================================================
END OF DIAGNOSTIC REPORT
================================================================================
```

---

**The diagnostic tool is now active and will automatically run after every message send!** 🎉



