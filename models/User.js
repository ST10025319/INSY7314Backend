const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  idNumber: { type: String, required: true, unique: true },
  accountNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'employee'], default: 'customer' },
  mfaSecret: { type: String },
  refreshToken: { type: String }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

//code attribution 
//The following method was taken from Microsoft Learn:
//Article:Microsoft Learn
//Link:https://www.geeksforgeeks.org/reactjs/react-suite-schema-component/
//const userModel = Schema.Model({
    //username: StringType().isRequired('Enter username!'),
    //age: NumberType('Age should be a number')
        //.range(0, 10, 'Enter between 0-10 year!')
//});

//code attribution
//The following method was taken from Microsoft Learn
//Article:Microsoft Learn:
//Link:https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-native-authentication-single-page-app-react-sign-in
//export interface TokenResponseType {
        //token_type: string;
        //scope: string;
        //expires_in: number;
        //access_token: string;
        //refresh_token: string;
        //id_token: string;
    //}