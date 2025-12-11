# BizTalk Message Delivery Debugging Guide

## Problem
Messages are getting response code `1000` (accepted by BizTalk) but not being delivered to KakaoTalk.

## What BizTalk Support Told Us

1. **Response code 1000 ≠ Delivery Success**: It only means BizTalk received the request
2. **Check Message Result API**: Must use `/v2/kko/getResultAll` to verify actual delivery
3. **Template Must Match EXACTLY**: Message payload must match approved template exactly
4. **Buttons/URLs Required**: If template has buttons or URLs, they must be included in the request
5. **Missing Parameters = Blocked**: Missing required parameters cause KakaoTalk to block the message

---

## Step 1: Check Delivery Status Using Message Result API

### Method A: Automatic Check (Now Enabled)

The code now automatically checks delivery status 3 seconds after sending. Check your server logs for:

```
[BizTalk Delivery Status] ========================================
[BizTalk Delivery Status] Status: SUCCESS or FAIL
[BizTalk Delivery Status] Status Code: ...
[BizTalk Delivery Status] Status Message: ...
```

### Method B: Manual Check via API Endpoint

```bash
# Replace MSG_ID with the actual msgIdx from your logs
GET /api/admin/biztalk/check-message?msgIdx=CLUB_JOINED_1763630911496_2324

# Example with curl
curl -X GET "http://localhost:3000/api/admin/biztalk/check-message?msgIdx=CLUB_JOINED_1763630911496_2324" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Method C: Command Line Script

```bash
# PowerShell
$env:BIZTALK_BSID="thenoldam"
$env:BIZTALK_PASSWD="your_password"
node scripts/check-biztalk.js CLUB_JOINED_1763630911496_2324
```

---

## Step 2: Analyze Delivery Status Response

### Success Response:
```json
{
  "responseCode": "1000",
  "resultList": [
    {
      "msgIdx": "CLUB_JOINED_...",
      "status": "SUCCESS",
      "statusCode": "2000",
      "statusMessage": "전송완료",
      "sentAt": "2025-01-21 10:30:00",
      "deliveredAt": "2025-01-21 10:30:05",
      "recipient": "01059415282"
    }
  ]
}
```

### Failure Response:
```json
{
  "responseCode": "1000",
  "resultList": [
    {
      "msgIdx": "CLUB_JOINED_...",
      "status": "FAIL",
      "statusCode": "1030",  // Error code from KakaoTalk
      "statusMessage": "템플릿 불일치",
      "errorCode": "1030",
      "errorMessage": "Template mismatch or missing required parameters"
    }
  ]
}
```

### Common Error Codes:
- **1030**: Template mismatch or missing parameters
- **1031**: Invalid button configuration
- **1032**: Missing required fields
- **1033**: Variable mismatch

---

## Step 3: Verify Request Payload Matches Template

### What to Check:

1. **Full Request Payload** is now logged:
   ```
   [BizTalk API Request payload] FULL REQUEST:
   {
     "msgIdx": "...",
     "countryCode": "82",
     "resMethod": "PUSH",
     "senderKey": "...",
     "tmpltCode": "club_joined-user",
     "recipient": "01059415282",
     "message": "...",
     "variables": { ... },
     "variable": { ... }
   }
   ```

2. **Compare with Approved Template**:
   - ✅ Template code matches: `club_joined-user`
   - ✅ Variables match template placeholders: `#{이름}`, `#{모임명}`, etc.
   - ✅ Message content matches template structure

### Current Implementation Issues:

1. **Template Format**: We're sending template with `<br>` tags, but BizTalk may require newlines (`\n`)
2. **Variables Format**: We're sending both `variables` and `variable` fields (for compatibility)
3. **Missing Buttons**: If template has buttons, we need to include them

---

## Step 4: Check Template Requirements in BizTalk Console

### Questions to Answer:

1. **Does the template have buttons?**
   - If YES: You must include `buttons` or `btns` field in request
   - Check BizTalk console for button configuration

2. **What format does the template use?**
   - `<br>` tags or newlines (`\n`)?
   - Check the exact template in BizTalk console

3. **What are the exact variable names?**
   - Must match exactly: `#{이름}` vs `#{name}`
   - Case sensitive!

4. **Are there any additional required fields?**
   - Some templates require specific fields we might be missing

---

## Step 5: Common Fixes

### Fix 1: Add Buttons if Template Requires Them

If your template has buttons in BizTalk console, add them:

```typescript
await sendAlimtalkMessage({
  recipientPhone,
  templateCode: 'club_joined-user',
  templateMessage: messageTemplate,
  msgIdxPrefix: 'CLUB_JOINED',
  variables: variables,
  buttons: [
    {
      name: '모임 라운지',
      type: 'WL',  // Web Link
      linkMo: 'https://thenoldam.com/meeting/lounge',  // Mobile link
      linkPc: 'https://thenoldam.com/meeting/lounge'   // PC link
    }
  ]
})
```

### Fix 2: Match Template Format Exactly

If template uses newlines, change to newlines:

```typescript
// Instead of:
const messageTemplate = '...#{변수명}...<br>...'

// Use:
const messageTemplate = '...#{변수명}...\n...'
```

### Fix 3: Verify Variable Names Match

Check BizTalk console for exact variable names:
- Template: `#{이름}` ✅
- Template: `#{name}` ❌ (won't match)

---

## Step 6: What to Send to BizTalk Support

### Include in your email:

1. **Full Request Payload** (from logs):
   ```json
   {
     "msgIdx": "CLUB_JOINED_...",
     "tmpltCode": "club_joined-user",
     "recipient": "01059415282",
     "message": "...",
     "variables": {...}
   }
   ```

2. **Delivery Status Result**:
   ```json
   {
     "status": "FAIL",
     "statusCode": "1030",
     "statusMessage": "..."
   }
   ```

3. **Template Screenshot**: From BizTalk console showing:
   - Template code
   - Template content
   - Variables/placeholders
   - Buttons (if any)

4. **Error Logs**: Any error codes or messages from delivery status

---

## Step 7: Testing Checklist

- [ ] Message gets response code 1000 (accepted)
- [ ] Check delivery status after 3 seconds
- [ ] Verify delivery status = SUCCESS
- [ ] If FAIL, check error code and message
- [ ] Compare request payload with template
- [ ] Verify all variables match template
- [ ] Include buttons if template has them
- [ ] Match template format (newlines vs <br>)

---

## Next Steps

1. **Enable automatic delivery checking** - Already done ✅
2. **Check logs after sending** - Look for delivery status
3. **If status = FAIL**: Check error code and fix accordingly
4. **If still not working**: Send full request payload to BizTalk support

---

## Quick Test

1. Send a test message (meeting joined notification)
2. Wait 3 seconds
3. Check server logs for `[BizTalk Delivery Status]`
4. Look for:
   - Status: SUCCESS = ✅ Delivered
   - Status: FAIL = ❌ Check error code
5. If FAIL, use the error code to identify the issue



