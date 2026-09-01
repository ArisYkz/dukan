/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your sign-in link — Dokan</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandLabel}>DOKAN</Text>
        <Heading style={title}>Hello!</Heading>
        <Text style={text}>Click the button below to sign in to your account:</Text>
        <Hr style={divider} />
        <div style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>
            Sign in
          </Button>
        </div>
        <Text style={footer}>
          If you did not request this, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif", margin: 0, padding: '32px 0' }
const container = { border: '1px solid hsl(40 18% 86%)', borderRadius: '4px', maxWidth: '560px', padding: '40px' }
const brandLabel = { color: 'hsl(28 45% 42%)', fontSize: '12px', letterSpacing: '0.18em', margin: '0 0 24px', textAlign: 'center' as const }
const title = { color: 'hsl(0 0% 15%)', fontFamily: "'Playfair Display', Georgia, serif", fontSize: '24px', fontWeight: 500, margin: '0 0 12px' }
const text = {
  fontSize: '14px',
  color: 'hsl(0 0% 40%)',
  lineHeight: '1.7',
  margin: '0 0 20px',
}
const divider = { borderColor: 'hsl(40 18% 86%)', margin: '24px 0' }
const buttonWrap = { margin: '32px 0 16px', textAlign: 'center' as const }
const button = { backgroundColor: 'hsl(0 0% 15%)', color: 'hsl(47 33% 97%)', fontSize: '13px', borderRadius: '4px', fontWeight: 600, letterSpacing: '0.14em', padding: '14px 32px', textDecoration: 'none', textTransform: 'uppercase' as const }
const footer = { fontSize: '12px', color: 'hsl(0 0% 60%)', lineHeight: '1.6', margin: '16px 0 0', textAlign: 'center' as const }
