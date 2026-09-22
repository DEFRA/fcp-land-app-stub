import { addressFields } from './fragments.js'

export const personalDetailsQuery = `
  query Customer($crn: ID!) {
    customer(crn: $crn) {
      crn
      info {
        name {
          first
          middle
          last
        }
        dateOfBirth
        address {
          ${addressFields}
        }
        email {
          address
        }
        phone {
          landline
          mobile
        }
      }
    }
  }
`
