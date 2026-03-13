package utils

import (
	"errors"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

func ValidateStruct(s interface{}) error {
	err := validate.Struct(s)
	if err != nil {
		if _, ok := err.(*validator.InvalidValidationError); ok {
			return err
		}
		for _, err := range err.(validator.ValidationErrors) {
			return errors.New("validation failed on field '" + err.Field() + "', condition: " + err.ActualTag())
		}
	}
	return nil
}
