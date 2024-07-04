const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Session extends Model {}

  Session.init({
    sessionName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    venue: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Add more attributes as needed
  }, {
    sequelize,
    modelName: 'Session',
    // Other options
  });

  return Session;
};
