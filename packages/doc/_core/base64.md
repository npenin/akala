---
title: Base64
parent: Welcome
nav_order: 2
---

# Base64

The Base64 module provides functionalities to encode and decode Base64 strings. Being written completely in Typescript, it may be used in any environment.

## Functions

### base64DecToArr

The `base64DecToArr` function decodes a Base64 string to a Uint8Array.

#### Parameters

- `sBase64: string`
- `nBlocksSize?: number`

#### Returns

- `Uint8Array`

### base64EncArr

The `base64EncArr` function encodes a Uint8Array to a Base64 string.

#### Parameters

- `aBytes: ArrayBuffer | Uint8Array`
- `nBlocksSize?: number`

#### Returns

- `string`

### base64UrlEncArr

The `base64UrlEncArr` function encodes a Uint8Array to a Base64 URL string.

#### Parameters

- `aBytes: ArrayBuffer | Uint8Array`

#### Returns

- `string`

### base64UrlDecToArr

The `base64UrlDecToArr` function decodes a Base64 URL string to a Uint8Array.

#### Parameters

- `s: string`

#### Returns

- `ArrayBuffer | Uint8Array`

### extractPrivateKey

The `extractPrivateKey` function extracts a private key from a PEM string.

#### Parameters

- `pem: string`

#### Returns

- `Uint8Array`

### extractPublicKey

The `extractPublicKey` function extracts a public key from a PEM string.

#### Parameters

- `pem: string`

#### Returns

- `Uint8Array`

### UTF8ArrToStr

The `UTF8ArrToStr` function converts a Uint8Array to a UTF-8 string.

#### Parameters

- `aBytes: ArrayBuffer | Uint8Array`

#### Returns

- `string`

### strToUTF8Arr

The `strToUTF8Arr` function converts a UTF-8 string to a Uint8Array.

#### Parameters

- `sDOMStr: string`

#### Returns

- `ArrayBuffer`
