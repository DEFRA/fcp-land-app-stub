export const updateCustomerDetailsMutation = `
  mutation UpdateCustomerAllFields($input: UpdateCustomerAllFieldsInput!) {
    updateCustomerAllFields(input: $input) {
      success
    }
  }
`
