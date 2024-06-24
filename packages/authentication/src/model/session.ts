import * as db from '@akala/storage'

/** 
 * Authentication methods are defined in RFC
 * 
 * [RFC8176](https://www.rfc-editor.org/rfc/rfc8176) */
export enum AuthenticationMethodReference
{

    /** Biometric authentication[RFC4949] using facial recognition. */
    face = 'face',

    /** Biometric authentication[RFC4949] using a fingerprint. */
    fpt = 'fpt',

    /** Use of geolocation information for authentication, such as that
     provided by[W3C.REC - geolocation - API - 20161108]. */
    geo = 'geo',

    /** Proof - of - Possession(PoP) of a hardware - secured key.See
    Appendix C of[RFC4211] for a discussion on PoP. */
    hwk = 'hwk',

    /** Biometric authentication[RFC4949] using an iris scan. */
    iris = 'iris',

    /** Knowledge - based authentication[NIST.800 - 63 - 2][ISO29115]. */
    kba = 'kba',

    /** Multiple - channel authentication[MCA].The authentication
     involves communication over more than one distinct communication
     channel.For instance, a multiple - channel authentication might
     involve both entering information into a workstation's browser and
     providing information on a telephone call to a pre - registered
     number. */
    mca = 'mca',

    /** Multiple - factor authentication[NIST.800 - 63 - 2][ISO29115].When
     this is present, specific authentication methods used may also be
     included. */
    mfa = 'mfa',

    /** One - time password[RFC4949].One - time password specifications
    that this authentication method applies to include[RFC4226] and
    [RFC6238].*/
    otp = 'otp',

    /** Personal Identification Number (PIN) [RFC4949] or pattern (not
        restricted to containing only numbers) that a user enters to
        unlock a key on the device.  This mechanism should have a way to
        deter an attacker from obtaining the PIN by trying repeated
        guesses. */
    pin = 'pin',

    /** Password-based authentication [RFC4949]. */
    pwd = 'pwd',

    /** Risk-based authentication [JECM]. */
    rba = 'rba',

    /** Biometric authentication [RFC4949] using a retina scan. */
    retina = 'retina',

    /** Smart card [RFC4949]. */
    sc = 'sc',

    /** Confirmation using SMS [SMS] text message to the user at a
     registered number. */
    sms = 'sms',

    /** Proof-of-Possession (PoP) of a software-secured key.  See
    Appendix C of [RFC4211] for a discussion on PoP. */
    swk = 'swk',

    /** Confirmation by telephone call to the user at a registered number.
    This authentication technique is sometimes also referred to as
    "call back" [RFC4949]. */
    tel = 'tel',

    /** User presence test.  Evidence that the end user is present and
    interacting with the device.  This is sometimes also referred to
    as "test of user presence" [W3C.WD-webauthn-20170216]. */
    user = 'user',

    /** Biometric authentication [RFC4949] using a voiceprint. */
    vbm = 'vbm',

    /** Windows integrated authentication [MSDN]. */
    wia = 'wia',
}

@db.Model
export class Session
{
    constructor()
    {
    }

    @db.Key(db.Types.string(36))
    public id: string;
    @db.Field(db.Types.string(36))
    public userId: string;
    @db.Field(db.Types.string(44))
    public deviceId: string;
    @db.Field(db.Types.datetime)
    public expiresOn?: Date;
    @db.Field(db.Types.datetime)
    public createdOn?: Date;
    @db.Field(db.Types.string)
    public authenticationMethod?: AuthenticationMethodReference;
}