/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="kk" dir="ltr">
    <Head />
    <Preview>🇰🇿 Растау коды / 🇷🇺 Код подтверждения — Duken</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandLabel}>DUKEN</Text>
        <Text style={localeLabel}>🇰🇿 ҚАЗАҚША</Text>
        <Heading style={title}>Растау коды</Heading>
        <Text style={text}>Жеке басыңызды растау үшін төмендегі кодты пайдаланыңыз:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={localeLabel}>🇷🇺 РУССКИЙ</Text>
        <Heading style={title}>Код подтверждения</Heading>
        <Text style={text}>Используйте код ниже для подтверждения вашей личности:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Егер сіз бұл сұранымды жібермесеңіз, бұл хатты елемеуіңізге болады.
          <br />
          Если вы не отправляли этот запрос, просто проигнорируйте это письмо.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif", margin: 0, padding: '32px 0' }
const container = { border: '1px solid hsl(40 18% 86%)', borderRadius: '4px', maxWidth: '560px', padding: '40px' }
const brandLabel = { color: 'hsl(28 45% 42%)', fontSize: '12px', letterSpacing: '0.18em', margin: '0 0 24px', textAlign: 'center' as const }
const localeLabel = { color: 'hsl(28 45% 42%)', fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 8px' }
const title = { color: 'hsl(0 0% 15%)', fontFamily: "'Playfair Display', Georgia, serif", fontSize: '24px', fontWeight: 500, margin: '0 0 12px' }
const text = {
  fontSize: '14px',
  color: 'hsl(0 0% 40%)',
  lineHeight: '1.7',
  margin: '0 0 20px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(0 0% 15%)',
  margin: '0 0 30px',
  textAlign: 'center' as const,
}
const footer = { fontSize: '12px', color: 'hsl(0 0% 60%)', lineHeight: '1.6', margin: '16px 0 0', textAlign: 'center' as const }
