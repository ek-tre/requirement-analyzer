# Vercel Authentication Setup

This project is secured by Vercel SSO. No in-app password is required.

## Quick Setup

### 1. Enable Vercel SSO protection

Go to your Vercel project:
- Open [vercel.com](https://vercel.com)
- Select your project: `discovery-and-design-planning`
- Go to **Settings** → **Deployment Protection**
- Enable your organization SSO for **Production** and **Preview**

### 2. Deploy to Vercel

```bash
cd /Users/ekenstam002/Documents/requirement-analyzer
vercel --prod
```

Or push to your Git repository if you have automatic deployments enabled.

## How It Works

- **Authentication**: Enforced by Vercel SSO before app access
- **Protection**: All app routes are protected by organization access rules

## Testing Locally

```bash
# Run dev server
npm run dev

# Visit http://localhost:5177
```

## Security Features

✅ SSO-protected access  
✅ Centralized identity and access control  
✅ No in-app credential management  
✅ No hardcoded passwords  

## Changing the Password

1. Update Vercel deployment protection policy in project settings
2. Redeploy if needed for policy changes

## Troubleshooting

**Can't log in after deployment?**
- Check that your user is included in allowed Vercel org/team access
- Complete your corporate SSO sign-in flow
- Clear browser cookies and try again

**Getting redirect loops?**
- Clear browser cache
- Check browser console for errors
- Verify Deployment Protection is configured correctly for Production and Preview

**Need to bypass temporarily?**
- Temporarily relax Vercel deployment protection policy (if approved by your security policy)
- Re-enable strict SSO protection after testing

## Team Access

To give someone access:
1. Add them to the allowed Vercel org/team or deployment protection audience
2. They visit your Vercel URL
3. They complete SSO login

## Alternative: Additional App-Layer Password

If your compliance model requires defense-in-depth, you can add an in-app password layer on top of SSO.
