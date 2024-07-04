const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Participant extends Model {}

  Participant.init({
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    // Add more attributes as needed
  }, {
    sequelize,
    modelName: 'Participant',
    // Other options
  });

  return Participant;
};
